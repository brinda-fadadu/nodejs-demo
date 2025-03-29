const _ = require('lodash')
const { upsert } = require('../utils')
const { getKey } = require('../../../lib/util')
const models = require('../../../models')
const moment = require('moment')
const NotesController = require('../notesController/notesController')
const ANRemainsController = require('../personController/anRemainsController')
// const CremationSyncController = require('../familyPortalController/cremationSyncController')
// const AgreementController = require('../agreementController/agreementController')
// const WholeSaleCremationController = require('../miscSalesController/wholeSalesController')
const Op = require('sequelize').Op
const hmisDB = require('../../../services/hmis/hmisConnection')
const hmisConfig = require('../../../config/hmis-config')
const faaWorker = require('../../../workers/faa_worker/CallFaaWorker')
const seedValues = require('../../../config/seed')

class WorkOrderController {
    constructor (id) {
        this.id = id
    }
    /**
     * This method gets you a Work order based on workOrder Id
     * @param {integer} workOrderId
     * @param {*} transaction
     */
    static async getWorkOrder (workOrderId, { scope }, transaction) {
        let workOrder = await models.WorkOrder.scope(scope).findOne({
            include: [
                {
                    model: models.Employee,
                    attributes: ['id', 'name', 'email'],
                    as: 'workOrderOwner'
                }
            ],
            where: {
                id: workOrderId
            },
            transaction
        })
        if (workOrder) {
            return workOrder
        } else {
            throw new Error('WORK_ORDER_NOT_FOUND')
        }
    }

    static getFuneralWorkOrderPrimaryQuery (scheduleServiceAttributeId) {
        let primaryQuery = `
            WorkOrder as wo
                INNER JOIN WorkOrderStatus as wos ON wos.id = wo.statusId
                LEFT JOIN WorkOrderDetail as wod on wod.workOrderId=wo.id
                LEFT JOIN WorkOrderChamberAccountabilityLog wocal on wocal.workOrderId=wo.id
                INNER JOIN ScheduledFuneralService as sfs ON (sfs.id = wo.resourceId AND wo.resourceType = 'ScheduledFuneralService')
                INNER JOIN Person as p ON p.id = sfs.personId
                INNER JOIN PersonVerificationDetails as pvd ON pvd.personId = p.id
                INNER JOIN SchedulingSection as ss ON ss.id = sfs.schedulingSectionId
                LEFT JOIN CemeteryInformationSection as cis ON cis.id= sfs.cemeteryInformationSectionId
                LEFT JOIN Location as loc ON loc.id in  (ss.clFacilityLocationId, cis.clCemeteryLocationId)
                LEFT JOIN Place on Place.id in  (ss.serviceLocationId, cis.cemeteryLocationId)
                LEFT JOIN Organization on Organization.id= Place.organizationId
                LEFT JOIN ReservedResource as rr on rr.id= ss.reservedChapelId
                LEFT JOIN Chapel c ON c.id = rr.resourceId
                LEFT JOIN ChapelTypeChapel ctc ON ctc.chapelId = c.id
                LEFT JOIN ChapelType ct ON ct.id = ctc.chapelTypeId
                LEFT JOIN AgreementLocationItem as ali ON ali.id = sfs.agreementLocationItemId
                LEFT JOIN AgreementPackageItem as api ON api.id = sfs.agreementPackageItemId
                LEFT JOIN AgreementCashAdvancedItem as acai ON acai.id = sfs.agreementCashAdvancedItemId
                LEFT JOIN AgreementPackage ap ON ap.id = api.agreementPackageId
                INNER JOIN Agreement as a ON a.id IN (ali.agreementId, ap.agreementId, acai.agreementId)
                LEFT JOIN Addendum as ad ON ad.id IN (ali.addendumId, acai.addendumId)
                INNER JOIN AgreementType as agt ON agt.id = a.type
                INNER JOIN LocationItem as li ON li.id IN (ali.locationItemId, api.locationItemId, acai.locationItemId)
        `
        if (scheduleServiceAttributeId) {
            primaryQuery = primaryQuery + (`INNER JOIN Attribute as at ON at.id = ${scheduleServiceAttributeId}`)
        }
        return primaryQuery
    }

    static getCemeteryWorkOrderPrimaryQuery (scheduleServiceAttributeId, serviceCategory) {
        let joinType = serviceCategory === 'All' ? 'LEFT' : 'INNER'
        let joinsCondition = `${joinType} JOIN ItemUsage as iu on iu.id = sfs.itemUsageId
                ${joinType} JOIN AgreementLocationItem as ali ON ali.id = iu.resourceId and iu.resourceType='AgreementLocationItem'`
        if (serviceCategory === 'Miscellaneous Sales') {
            joinsCondition = `INNER JOIN AgreementLocationItem as ali ON ali.id = sfs.agreementLocationItemId`
        }
        joinsCondition = serviceCategory === 'All' ? `${joinsCondition} ${joinType} JOIN AgreementLocationItem as ali1 ON ali1.id = sfs.agreementLocationItemId` : joinsCondition
        return `
        WorkOrder as wo
                INNER JOIN WorkOrderStatus as wos ON wos.id = wo.statusId
                LEFT JOIN WorkOrderDetail as wod on wod.workOrderId=wo.id
                LEFT JOIN WorkOrderChamberAccountabilityLog wocal on wocal.workOrderId=wo.id
                INNER JOIN ScheduledCemeteryService as sfs  ON sfs.id = wo.resourceId
                INNER JOIN Person as p ON p.id = sfs.personId
                INNER JOIN PersonVerificationDetails as pvd ON pvd.personId = p.id
                ${joinsCondition}
                INNER JOIN Agreement as a ON a.id = ${serviceCategory === 'All' ? `CASE WHEN ali.agreementId IS NULL THEN ali1.agreementId ELSE ali.agreementId END` : `ali.agreementId`}
                INNER JOIN AgreementType as agt ON agt.id = a.type
                LEFT JOIN Addendum as ad ON ad.id = ${serviceCategory === 'All' ? `CASE WHEN ali.addendumId IS NULL THEN ali1.addendumId ELSE ali.addendumId END` : `ali.addendumId`}
                LEFT JOIN IntermentInformationSection iis on sfs.intermentInformationSectionId=iis.id
                LEFT JOIN DisintermentInfoSection dis on sfs.disintermentInfoSectionId=dis.id
                `
    }

    // --- Lets move this to the iterator that we have below:
    // lsu.Location as temporaryDisintermentLocation,
    //  LEFT JOIN [${hmisDBConfigHost}].[${hmisDBName}].dbo.Lot_Sell_Unit as lsu on (lsu.Lot_Sell_Unit_ID = iis.temporaryBurialLocationId or lsu.Lot_Sell_Unit_ID = iis.temporaryDisintermentLocationId )
    static getWorkOrderSearchQuery (searchTerm, serviceCategory) {
        let searchQuery = ''
        searchTerm = _.trim(searchTerm)
        if (searchTerm) {
            let searchByDate = ''

            const searchFormat = moment(searchTerm, 'YYYY-MM-DDTHH:mm:ssZ', true)
            if (searchFormat.isValid()) {
                let nextDate = moment(searchTerm).add(23, 'hours').add(59, 'minutes').add(59, 'seconds').toJSON()
                searchByDate = `OR
                    ${serviceCategory === 'Funeral' ? `ss.beginningTime` : `case when iis.beginningTime IS NULL THEN dis.beginningTime ELSE iis.beginningTime END `} BETWEEN '${searchTerm}' AND '${nextDate}'`
            }
            let words = searchTerm.split(' ')
            if (words.length > 0) {
                // let nameStr = ''
                // words.map(item => {
                //     nameStr = nameStr + ` p.firstName LIKE '%${item}%' OR
                //     p.middleName LIKE '%${item}%' OR
                //     p.lastName LIKE '%${item}%' OR`
                //     return item
                // })
                let wordsArr = '\'' + searchTerm.split(' ').join('\',\'') + '\''

                let nameStr = ` p.firstName LIKE '%${searchTerm}%' OR p.middleName LIKE '%${searchTerm}%' OR p.lastName LIKE '%${searchTerm}%' OR p.firstName IN (${wordsArr}) OR p.middleName IN (${wordsArr}) OR p.lastName IN (${wordsArr}) `

                searchQuery = `
                AND 
                ( 
                    ${nameStr} OR
                    pvd.onePortalId LIKE '${searchTerm}%' OR
                    ad.addendumNumber like '%${searchTerm}%' OR
                    wo.onePortalWorkOrderId LIKE '${searchTerm}%' ${searchByDate}
                )`
            } else {
                searchQuery = `
                AND 
                ( 
                    p.firstName LIKE '%${searchTerm}%' OR
                    p.middleName LIKE '%${searchTerm}%' OR
                    p.lastName LIKE '%${searchTerm}%' OR
                    pvd.onePortalId LIKE '${searchTerm}%' OR
                    ad.addendumNumber like '%${searchTerm}%' OR
                    wo.onePortalWorkOrderId LIKE '${searchTerm}%' ${searchByDate}
                )`
            }
        }
        return searchQuery
    }

    /**
     * This function gets all the work orders based on Filters.
     * @param {string} status EX: unassigned, assigned, closed
     * @param {object} filters
     * @param {integer} filters.serviceCategory default = Funeral
     * @param {integer} filters.page default = 0
     * @param {integer} filters.limit default= 10
     * @param {string} filters.searchTerm, can send     date in certain format
     * @param {string} filter.order must be ASC/DESC
     * @param {string} filter.startDate
     * @param {string} filter.endDate
     * @param {string} filter.resourceCategory EX: Chapel, Reception, Crematory_Retort
     * @param {integer} filter.resourceTypeId
     * @param {*} transaction
     */
    static async getListOfWorkOrders (status = 'unassigned', filters = {}) {
        try {
            let { page = 1, limit = 10, order = 'ASC', startDate, endDate, serviceCategory = 'All', searchTerm, deleted = false, resourceCategory, resourceTypeId, timezone } = filters
            resourceTypeId = resourceTypeId && JSON.parse(resourceTypeId)
            // TODO: Remove the comments once it's fixed from FE
            // startDate format "1800-01-01" incorrect from FE
            // endDate format ""2030-05-20T12:37:56.805Z"" incorrect from FE
            let statuses = `('${status}')`
            page = (page - 1) * limit

            let deleteQuery = `IS NULL`
            if (String(deleted) === 'true') {
                deleteQuery = `IS NOT NULL`
                statuses = `('unassigned','assigned','closed')`
            }
            if (!startDate && !endDate) {
                startDate = '1972-01-01'
                endDate = moment().add(10, 'years').format('YYYY-MM-DD') // new Date(new Date().setFullYear(new Date().getFullYear() + 10))
            } else if (!startDate) {
                startDate = '1972-01-01'
            } else if (!endDate) {
                endDate = moment().add(10, 'years').format('YYYY-MM-DD') // new Date(new Date().setFullYear(new Date().getFullYear() + 10))
            }

            startDate = moment(startDate).tz(timezone).startOf('day').format()
            endDate = moment(endDate).tz(timezone).endOf('day').format()

            let cemeteryAgreementType = await models.AgreementType.findOne({ where: { agreementType: 'Cemetry' } })
            let funeralAgreementType = await models.AgreementType.findOne({ where: { agreementType: 'Funeral' } })
            let wholeSaleCremationAgreementType = await models.AgreementType.findOne({ where: { agreementType: 'Wholesale Cremation' } })
            let miscSalesAgreementType = await models.AgreementType.findOne({ where: { agreementType: 'Miscellaneous Sales' } })
            // let agreementType = await models.AgreementType.findOne({ where: { agreementType: serviceCategory } })
            let scheduleServiceAttribute = await models.Attribute.findOne({ where: { name: 'Scheduling Service' } })
            const scheduleServiceAttributeId = _.get(scheduleServiceAttribute, 'id')

            let funeralQuery = this.getFuneralWorkOrderPrimaryQuery(scheduleServiceAttributeId)
            let cemeteryQuery = this.getCemeteryWorkOrderPrimaryQuery(scheduleServiceAttributeId, serviceCategory)
            let miscQuery = this.getCemeteryWorkOrderPrimaryQuery(scheduleServiceAttributeId, 'Miscellaneous Sales')

            // let primaryQuery = serviceCategory === 'Funeral' ? this.getFuneralWorkOrderPrimaryQuery(scheduleServiceAttributeId) : this.getCemeteryWorkOrderPrimaryQuery(scheduleServiceAttributeId)

            let agreementTypeFilter = ''

            if (serviceCategory === 'Cemetry') {
                agreementTypeFilter = `AND agt.id IN (${cemeteryAgreementType.id})`
            } else if (serviceCategory === 'Wholesale Cremation') {
                agreementTypeFilter = `AND agt.id IN (${wholeSaleCremationAgreementType.id})`
            } else if (serviceCategory === 'Miscellaneous Sales') {
                agreementTypeFilter = `AND agt.id IN (${miscSalesAgreementType.id})`
            } else {
                agreementTypeFilter = `AND agt.id IN (${cemeteryAgreementType.id},${wholeSaleCremationAgreementType.id},${miscSalesAgreementType.id})`
            }
            let funeralAgreementTypeFilter = ''
            if (serviceCategory === 'Funeral') {
                funeralAgreementTypeFilter = `AND agt.id IN (${funeralAgreementType.id})`
            } else if (serviceCategory === 'Miscellaneous Sales') {
                funeralAgreementTypeFilter = `AND agt.id IN (${miscSalesAgreementType.id})`
            } else {
                funeralAgreementTypeFilter = `AND agt.id IN (${miscSalesAgreementType.id},${funeralAgreementType.id})`
            }

            let cemeteryConditions = `WHERE 
                        wos.name IN ${statuses}
                        AND  wo.resourceType = 'ScheduledCemeteryService'
                        AND ( ${searchTerm ? 'iis.beginningTime IS NULL OR' : ''} (CASE WHEN iis.beginningTime IS NULL THEN dis.beginningTime ELSE iis.beginningTime END BETWEEN  '${startDate.split('"').join('')}' AND  '${endDate.split('"').join('')}'))
                        ${agreementTypeFilter}
                        AND wo.deletedAt ${deleteQuery}`

            let funeralConditions = `WHERE 
                        wos.name IN ${statuses}
                        AND wo.resourceType = 'ScheduledFuneralService'
                        AND (ss.beginningTime IS NULL OR (ss.beginningTime BETWEEN  '${startDate.split('"').join('')}' AND  '${endDate.split('"').join('')}'))
                        ${funeralAgreementTypeFilter}
                        AND wo.deletedAt ${deleteQuery}
                        ${!searchTerm ? `AND ss.beginningTime is not null` : ''}
                        `
            // let conditions = `WHERE
            //             wos.name IN ${statuses}
            //             AND  wo.resourceType=${serviceCategory === 'Funeral' ? `'ScheduledFuneralService'` : `'ScheduledCemeteryService'`}
            //             AND  ${serviceCategory === 'Funeral' ? `ss.beginningTime` : `CASE WHEN iis.beginningTime IS NULL THEN dis.beginningTime ELSE iis.beginningTime END `}  BETWEEN  '${startDate.split('"').join('')}' AND  '${endDate.split('"').join('')}'
            //             AND agt.id = ${agreementType.id}
            //             AND wo.deletedAt ${deleteQuery}
            //             AND wo.deletedAt ${deleteQuery}
            //             `
            let count; let result = []

            if (status === 'unassigned' && resourceCategory === 'Crematory_Retort') {
                // this condition is added because we do not have a Crematory_Retort resource in unassigned work orders
                count = [{ total: 0 }]
                result = []
            } else if ((serviceCategory !== 'Funeral' && serviceCategory !== 'Miscellaneous Sales') && serviceCategory !== 'All' && (resourceCategory === 'Chapel' || resourceCategory === 'Reception')) {
                // this condition is added because we do not have a relation to Chapel/ Reception for cemetery Scheduling service/ Work Order
                count = [{ total: 0 }]
                result = []
            } else {
                if (resourceCategory && resourceTypeId && resourceTypeId.length) {
                    // resourceCategory chapel and reception are for funeral only
                    // Crematory_Retort is available only after work order is moved from unassigned
                    if (resourceCategory === 'Crematory_Retort') {
                        // TODO: Which condition should this be added to funeral or cemetery
                        cemeteryConditions += ` AND wocal.chamberNumber IN (${resourceTypeId}) AND wocal.type='chamberPlacement'`
                        funeralConditions += ` AND wocal.chamberNumber IN (${resourceTypeId}) AND wocal.type='chamberPlacement' `
                        // conditions += ` AND wod.crematoryRetortId IN (${resourceTypeId}) `
                    } else if (serviceCategory === 'Funeral' || serviceCategory === 'Miscellaneous Sales') {
                        if (resourceTypeId.length) {
                            funeralConditions += `AND c.id IN (${resourceTypeId})`
                        }
                        funeralConditions += ` AND rr.resourceType='Chapel'  AND ct.name = '${resourceCategory}' `
                    }
                }

                let funeralSearchQuery = this.getWorkOrderSearchQuery(searchTerm, 'Funeral')
                let cemeterySearchQuery = this.getWorkOrderSearchQuery(searchTerm, 'Cemetry')
                // let searchQuery = this.getWorkOrderSearchQuery(searchTerm, serviceCategory)

                let countQuery

                if (serviceCategory === 'All' || serviceCategory === 'Miscellaneous Sales') {
                    countQuery = `
                    SELECT SUM(grouped.total) AS total FROM
                    (SELECT COUNT (funeralWorkOrders.id) AS total FROM (SELECT DISTINCT wo.id FROM ${funeralQuery} ${funeralConditions} ${funeralSearchQuery}) AS funeralWorkOrders
                    UNION
                    SELECT COUNT (cemeteryWorkdOrders.id) AS total FROM (SELECT DISTINCT wo.id FROM ${cemeteryQuery} ${cemeteryConditions} ${cemeterySearchQuery}) AS cemeteryWorkdOrders
                    UNION
                    SELECT COUNT (cemeteryWorkdOrders.id) AS total FROM (SELECT DISTINCT wo.id FROM ${miscQuery} ${cemeteryConditions} ${cemeterySearchQuery}) AS cemeteryWorkdOrders) AS grouped`
                } else if (serviceCategory === 'Funeral') {
                    countQuery = `SELECT COUNT (funeralWorkOrders.id) AS total FROM (SELECT DISTINCT wo.id FROM ${funeralQuery} ${funeralConditions} ${funeralSearchQuery}) AS funeralWorkOrders`
                } else {
                    // Note: The same seachQuery goes for wholesale cremation
                    countQuery = `SELECT COUNT (cemeteryWorkdOrders.id) AS total FROM (SELECT DISTINCT wo.id FROM ${cemeteryQuery} ${cemeteryConditions} ${cemeterySearchQuery}) AS cemeteryWorkdOrders`
                }
                // let countQuery = `SELECT COUNT(DISTINCT wo.id) AS total FROM ${primaryQuery} ${conditions} ${searchQuery}`
                let itemsQuery
                if (serviceCategory === 'All' || serviceCategory === 'Miscellaneous Sales') {
                    itemsQuery = `select  * from ((SELECT DISTINCT    
                        wo.id,
                        wo.createdAt,
                        wo.onePortalWorkOrderId,
                        wos.name as status,
                        p.firstName, 
                        p.lastName,
                        a.contractNumber,
                        p.middleName,
                        p.id as personId,
                        pvd.onePortalId,
                        wo.completedOn,
                        ad.addendumNumber, 
                        null as burialInfoId,
                        ss.beginningTime,
                        ss.endingTime,
                        null as burialInfoKey,
                        li.id as locationItemId,
                        a.id as agreementId,
                        agt.agreementType,
                        case when loc.name is null then Organization.name else loc.name end as facilityName,
                        null as temporaryLocationId
                        FROM 
                        ${this.getFuneralWorkOrderPrimaryQuery(scheduleServiceAttributeId)} 
                        ${funeralConditions + '' + funeralSearchQuery}
                        ) UNION (
                        SELECT  DISTINCT  
                        wo.id,
                        wo.createdAt,
                        wo.onePortalWorkOrderId,
                        wos.name as status,
                        p.firstName, 
                        p.lastName,
                        a.contractNumber, 
                        p.middleName ,
                        p.id as personId,
                        pvd.onePortalId,
                        wo.completedOn,
                        ad.addendumNumber,
                        CASE WHEN iis.id IS NULL THEN 0 ELSE iis.id END as burialInfoId ,
                        CASE WHEN iis.beginningTime IS NULL THEN dis.beginningTime ELSE iis.beginningTime END as beginningTime,
                        CASE WHEN iis.endingTime IS NULL THEN dis.endingTime ELSE iis.endingTime END as endingTime,
                        CASE WHEN iis.id IS NULL THEN 'disintermentInfoSectionId' ELSE 'intermentInfoSectionId' END as burialInfoKey,
                        ${serviceCategory === 'All' ? `CASE WHEN ali.locationItemId IS NULL THEN ali1.locationItemId ELSE ali.locationItemId END locationItemId` : `ali.locationItemId`},
                        a.id as agreementId,
                        agt.agreementType,
                        NULL as facilityName,
                        CASE WHEN iis.temporaryBurialLocationId IS NULL THEN iis.temporaryDisintermentLocationId ELSE iis.temporaryBurialLocationId END as temporaryLocationId
                        FROM
                        ${this.getCemeteryWorkOrderPrimaryQuery(scheduleServiceAttributeId, serviceCategory)}  
                        ${cemeteryConditions + '' + cemeterySearchQuery}
                        )) list order by list.beginningTime ${order}  OFFSET ${page} ROWS FETCH NEXT ${limit} ROWS ONLY`
                } else if (serviceCategory === 'Cemetry' || serviceCategory === 'Wholesale Cremation') {
                    itemsQuery = `SELECT DISTINCT
                        wo.id,
                        wo.createdAt,
                        wo.onePortalWorkOrderId, 
                        wos.name as status, 
                        p.id as personId,
                        p.firstName, 
                        p.lastName,
                        a.contractNumber, 
                        p.middleName, 
                        pvd.onePortalId,
                        wo.completedOn,
                        ad.addendumNumber,
                        CASE WHEN iis.id IS NULL THEN null ELSE iis.id END as burialInfoId ,
                        CASE WHEN iis.beginningTime IS NULL THEN dis.beginningTime ELSE iis.beginningTime END as beginningTime,
                        CASE WHEN iis.endingTime IS NULL THEN dis.endingTime ELSE iis.endingTime END as endingTime,
                        CASE WHEN iis.id IS NULL THEN 'disintermentInfoSectionId' ELSE 'intermentInfoSectionId' END as burialInfoKey,
                        ali.locationItemId,
                        a.id as agreementId,
                        agt.agreementType ,
                        CASE WHEN iis.temporaryBurialLocationId IS NULL THEN iis.temporaryDisintermentLocationId ELSE iis.temporaryBurialLocationId END as temporaryLocationId
                    FROM  ${cemeteryQuery} ${cemeteryConditions + '' + cemeterySearchQuery} 
                    ORDER BY beginningTime ${order}
                    OFFSET ${page} ROWS FETCH  NEXT ${limit} ROWS ONLY`
                } else {
                    itemsQuery = `SELECT DISTINCT
                        wo.id,
                        wo.createdAt,
                        wo.onePortalWorkOrderId, 
                        wo.completedOn,
                        wos.name as status, 
                        p.id as personId,
                        p.firstName, 
                        p.lastName,
                        a.contractNumber,
                        ad.addendumNumber, 
                        p.middleName, 
                        pvd.onePortalId,
                        case when loc.name is null then Organization.name else loc.name end as facilityName,
                        ss.beginningTime,
                        ss.endingTime,
                        li.id as locationItemId,
                        a.id as agreementId,
                        agt.agreementType,
                        c.name as chapelName
                    FROM ${funeralQuery} ${funeralConditions + '' + funeralSearchQuery} 
                    ORDER BY ss.beginningTime ${order}
                    OFFSET ${page} ROWS FETCH  NEXT ${limit} ROWS ONLY`
                }

                count = await models.sequelize.query(countQuery, {
                    type: models.sequelize.QueryTypes.SELECT
                })

                const workOrders = await models.sequelize.query(itemsQuery, {
                    type: models.sequelize.QueryTypes.SELECT
                })

                let promises = []
                let workOrderDetails = []
                let employeeDetails = []
                workOrders.forEach(val => {
                    const subServicesQuery = `select subs.name,subs.id  from WorkOrder as wo
                    INNER JOIN ScheduledFuneralService as sfs ON sfs.id = wo.resourceId
                    INNER JOIN SubServiceSection as sss on sss.scheduledFuneralServiceId = sfs.id
                    INNER JOIN SubService as subs on subs.id = sss.subServiceId where wo.id=${val.id} and wo.resourceType='ScheduledFuneralService'`
                    promises.push(models.sequelize.query(subServicesQuery, {
                        type: models.sequelize.QueryTypes.SELECT
                    }))
                    workOrderDetails.push(this.getWorkOrder(val.id, { scope: '' }))
                    employeeDetails.push(this.getEmployeeDetails(val.id))
                })
                const promiseResult = await Promise.all(promises)

                const workOrderInfo = await Promise.all(workOrderDetails)
                const employeesScheduleInfo = await Promise.all(employeeDetails)

                const hmisDBName = hmisConfig[process.env.NODE_ENV].database
                const hmisDBConfigHost = hmisConfig[process.env.NODE_ENV].host

                await Promise.all(workOrders.map(async (workOrder, index) => {
                    // get all Sub services for each WO
                    workOrder['subServices'] = promiseResult[index]

                    // get workOrderOwner info for each WO
                    workOrder['workOrderOwner'] = workOrderInfo[index].workOrderOwner

                    // get workOrderOwner info for each WO
                    workOrder['employeesSchedule'] = employeesScheduleInfo[index]

                    // Get all warnings that are necessary
                    workOrder['warnings'] = []
                    const daysToWorkOrder = moment(workOrder.beginningTime).diff(new Date(), 'seconds')
                    const endingTime = moment(workOrder.endingTime).diff(new Date(), 'seconds')
                    const dueAmountQuery = `select due from Agreement where id=${workOrder.agreementId}`
                    const dueAmount = await models.sequelize.query(dueAmountQuery, {
                        type: models.sequelize.QueryTypes.SELECT
                    })
                    // fetching property gardern name
                    if (workOrder.burialInfoKey) {
                        let propertyGardenQuery = `select pg.name from CemeteryScheduledProperty csp
                        INNER JOIN AgreementProperty as ap on ap.id=(select resourceId from ItemUsage where ItemUsage.id=csp.propertyId and ItemUsage.resourceType='AgreementProperty')
                        INNER JOIN Property as prop on prop.id=ap.propertyId
                        INNER JOIN PropertyGarden as pg on pg.id=prop.propertyGardenId
                        where csp.${workOrder.burialInfoKey}= ${workOrder.burialInfoId}`
                        const propertyGardenName = await models.sequelize.query(propertyGardenQuery, {
                            type: models.sequelize.QueryTypes.SELECT
                        })
                        workOrder.propertyGarden = propertyGardenName.length ? propertyGardenName[0].name : ''
                    }
                    // fetching service name
                    if (workOrder.locationItemId) {
                        let serviceNameQuery = `  select av.name  from  LocationItem  as li
                        INNER JOIN Item as i ON i.id = li.itemId
                        INNER JOIN ItemAttributeValue as iav ON iav.itemId = i.id
                        INNER JOIN AttributeValue as av ON av.id = iav.attributeValueId AND av.attributeId = ${scheduleServiceAttributeId}
                        where li.id = ${workOrder.locationItemId}
                        `
                        const serviceName = await models.sequelize.query(serviceNameQuery, {
                            type: models.sequelize.QueryTypes.SELECT
                        })
                        workOrder.serviceName = serviceName.length ? serviceName[0].name : ''
                    }
                    // fetching temporary location
                    if (workOrder.temporaryLocationId) {
                        let temporaryLocationQuery = ` select Location  from [${hmisDBConfigHost}].[${hmisDBName}].dbo.Lot_Sell_Unit where Lot_Sell_Unit_ID=${workOrder.temporaryLocationId}`
                        const temporayLocation = await models.sequelize.query(temporaryLocationQuery, {
                            type: models.sequelize.QueryTypes.SELECT
                        })
                        workOrder.temporaryPropertyLocation = temporayLocation.length ? temporayLocation[0].Location : ''
                    }
                    let tomorrowWarning = ''
                    if (
                        endingTime < 0 &&
                        workOrder['status'] === 'assigned'
                    ) {
                        workOrder['warnings'].push(
                            'Due date passed. Confirm and close work order'
                        )
                    } else {
                        if (daysToWorkOrder < 0 && workOrder['status'] === 'unassigned') {
                            workOrder['warnings'].push(
                                'Due date passed. Assign required resources now'
                            )
                        } else if (daysToWorkOrder < 86400 && workOrder['status'] === 'unassigned') {
                            tomorrowWarning = true
                            workOrder['warnings'].push(
                                'Due date is tomorrow. Assign required resources now'
                            )
                        }
                        if ((serviceCategory === 'Cemetry' || serviceCategory === 'All') && workOrder.serviceName === 'Cemetery Graveside Service') {
                            const scheduleIsPreburiedQuery = `select iis.isPreburied from WorkOrder as wo inner join ScheduledCemeteryService as scs on scs.id = wo.resourceId
                            inner join IntermentInformationSection as iis on iis.id = scs.intermentInformationSectionId where wo.id= ${workOrder.id}`

                            const workorderIsPreburiedQuery = `select isPreburied from WorkOrderDetail where workOrderId=${workOrder.id}`
                            const workorderIsPreburied = await models.sequelize.query(workorderIsPreburiedQuery, {
                                type: models.sequelize.QueryTypes.SELECT
                            })
                            const scheduleIsPreburied = await models.sequelize.query(scheduleIsPreburiedQuery, {
                                type: models.sequelize.QueryTypes.SELECT
                            })
                            if (scheduleIsPreburied.length && workorderIsPreburied.length) {
                                if (scheduleIsPreburied[0].isPreburied === 'true' && workorderIsPreburied[0].isPreburied === false) {
                                    workOrder['warnings'].push(`Pre-Buried is marked as 'No' in WO whereas as 'Yes' in Scheduling`)
                                }
                            }
                        }
                    }
                    if (daysToWorkOrder > 0 && daysToWorkOrder < 86400 && dueAmount[0].due > 0) {
                        if (tomorrowWarning) {
                            workOrder['warnings'].push(
                                'Service is not paid in full'
                            )
                        } else {
                            workOrder['warnings'].push(
                                'Due date is tomorrow. Service is not paid in full'
                            )
                        }
                    }
                    result.push(workOrder)
                }))
            }
            return {
                total: count[0].total,
                items: result
            }
        } catch (error) {
            throw error
        }
    }

    /**
     * To generate unique OnePortalWorkOrderId
     */
    static generateOnePortalWorkOrderId () {
        let date = moment().format('YYYY-MM-DD')
        date = date.replace(/[^\w\s]/gi, '')

        let timeStamp = moment()
            .toDate()
            .getTime()
        timeStamp = timeStamp.toString()
        timeStamp = timeStamp.substr(timeStamp.length - 6)

        let uniqueOnePortalId = `WO-${date}-${timeStamp}`
        return uniqueOnePortalId
    }

    /**
     * This method will create or delete a work order
     * @param {object} payload
     * @param {integer} payload.resourceType
     * @param {integer} payload.resourceId
     * @param {integer} userId
     * @param {*} transaction Sequelize transaction
     */
    static async createWorkOrder (payload, userId, transaction) {
        let unAssignedStatusObj = await models.WorkOrderStatus.findOne({
            where: {
                name: 'unassigned'
            },
            transaction
        })
        let unAssignedStatusId = unAssignedStatusObj.id ? unAssignedStatusObj.id : 1
        payload.statusId = unAssignedStatusId
        payload.onePortalWorkOrderId = WorkOrderController.generateOnePortalWorkOrderId()
        let workOrder = await upsert('WorkOrder', payload, transaction, { userId })
        return workOrder
    }

    /**
     * This method is used to delete work orders and any dependent Employee schedules. Resources such as Hearse and Utility Cars are being taken care at Scheduling level.
     * @param {*} resourceId
     * @param {*} resourceType
     * @param {*} userId
     * @param {string} timezone
     * @param {*} transaction
     */
    static async deleteWorkOrder (resourceId, resourceType, userId, timezone, transaction) {
        try {
            const workOrder = await models.WorkOrder.findOne({
                where: {
                    [Op.and]: [
                        { resourceType },
                        { resourceId },
                        { deletedAt: null },
                        { deletedBy: null }
                    ]
                },
                transaction
            })
            if (!workOrder) {
                throw new Error('WORK_ORDER_NOT_FOUND')
            }
            const { queueNames, queues } = require('../../../appQueues')
            const workOrderEmailWorker = queues[queueNames.email_queue]
            let res = await WorkOrderController.getWorkOrderDetails(workOrder.id, transaction)
            let contractNumber
            if (res.resourceType === 'ScheduledCemeteryService') {
                contractNumber = await WorkOrderController.getContractNumber(res.resourceId, transaction)
            } else {
                contractNumber = res.schedulingDetails.contractNumber
            }
            res.schedulingDetails.contractNumber = contractNumber
            let workOrderEmailData = {
                workOrderDetail: res,
                status: 'Canceled',
                timezone
            }
            workOrderEmailWorker.add('WorkOrderEmail', workOrderEmailData)
            await WorkOrderController.removeWorkOrderScheduleAndResources(resourceId, resourceType, userId, transaction, false)
            await models.WorkOrder.update({
                deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                deletedBy: userId
            }, {
                where: { id: workOrder.id },
                transaction
            })
            if (workOrder.personRemainsTransferId) {
                await models.PersonRemainsTransfer.update({
                    deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                    deletedBy: userId
                }, {
                    where: { id: workOrder.personRemainsTransferId },
                    transaction
                })
            }
            return true
        } catch (err) {
            throw err
        }
    }

    /**
     * This method soft deletes all the resources and employee schedule assigned to the work order linked to SchedulingService
     * @param {*} resourceId
     * @param {*} resourceType
     * @param {*} userId
     * @param {*} transaction
     * @param {boolean} deleteWorkOrderDetails
     */
    static async removeWorkOrderScheduleAndResources (resourceId, resourceType = 'ScheduledFuneralService', userId, transaction, updateWorkOrderDetails = true, fromWO = false) {
        try {
            // Get Work order using scheduledServiceId
            const workOrder = await models.WorkOrder.findOne({
                where: {
                    [Op.and]: [
                        { resourceType },
                        { resourceId },
                        { deletedAt: null },
                        { deletedBy: null }
                    ]
                },
                transaction
            })
            // Soft delete resources and Work order status to unassigned
            if (!workOrder) {
                return true
            }
            let workOrderPayload = {
                statusId: 1,
                id: workOrder.id
            }

            let employeeSchedulePayload = {
                deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                deletedBy: userId
            }

            let workOrderChamberAccountabilityLogPaylod = {
                deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                deletedBy: userId
            }

            let decedentAndCremationDetailsPayload = {
                deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                deletedBy: userId
            }

            if (updateWorkOrderDetails) {
                workOrderPayload['workOrderOwnerId'] = null
                employeeSchedulePayload['replacedBy'] = userId
                workOrderChamberAccountabilityLogPaylod['replacedBy'] = userId
                decedentAndCremationDetailsPayload['replacedBy'] = userId
            }

            if (!fromWO) {
                await upsert('WorkOrder', workOrderPayload, transaction, { userId })
            }
            // Soft delete Employee Schedule
            await models.EmployeeSchedule.update(employeeSchedulePayload, {
                where: {
                    workOrderId: workOrder.id
                },
                transaction
            })
            // Soft delete WorkOrder Chamber Accountability Log
            await models.WorkOrderChamberAccountabilityLog.update(workOrderChamberAccountabilityLogPaylod, {
                where: {
                    workOrderId: workOrder.id
                },
                transaction
            })
            // Soft delete WorkOrder Decedent And Cremation Details
            await models.DecedentAndCremationDetails.update(decedentAndCremationDetailsPayload, {
                where: {
                    workOrderId: workOrder.id
                },
                transaction
            })
            let workOrderDetailPayload = {
                deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                deletedBy: userId
            }
            // Soft delete WorkOrder Details
            await models.WorkOrderDetail.update(workOrderDetailPayload, {
                where: {
                    workOrderId: workOrder.id
                },
                transaction
            })
            return 'success'
        } catch (err) {
            throw err
        }
    }

    /**
     * Method to fetch the status code for work orders
     * @param {string} statusName
     * @param {*} transaction
     */
    static async getStatusId (statusName, transaction) {
        try {
            let statusCodeQuery = `SELECT WorkOrderStatus.id FROM WorkOrderStatus
            WHERE WorkOrderStatus.name = '${statusName}'`

            let statusId = await models.sequelize.query(statusCodeQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                transaction
            })

            let { id } = statusId[0]

            return id
        } catch (error) {
            throw error
        }
    }

    /**
     * Method to fetch the contract number for the scheduled cemetery service
     * @param {integer} scheduledCemeteryServiceId
     */
    static async getContractNumber (scheduledCemeteryServiceId, transaction) {
        try {
            let resourceQuery = `SELECT CASE WHEN scs.itemUsageId IS NULL THEN scs.agreementLocationItemId ELSE ItemUsage.resourceId END as resourceId,
                CASE WHEN scs.itemUsageId IS NULL THEN 'AgreementLocationItem' ELSE ItemUsage.resourceType END as resourceType
                FROM ScheduledCemeteryService scs
                LEFT JOIN ItemUsage ON ItemUsage.id = scs.itemUsageId
                WHERE scs.id = ${scheduledCemeteryServiceId}`

            let resourceDetails = await models.sequelize.query(resourceQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                transaction
            })

            let contractNumberQuery = `SELECT Agreement.contractNumber
            FROM ${resourceDetails[0].resourceType}
            INNER JOIN Agreement ON Agreement.id = ${resourceDetails[0].resourceType}.agreementId
            WHERE ${resourceDetails[0].resourceType}.id = ${resourceDetails[0].resourceId}`

            let contractNumber = await models.sequelize.query(contractNumberQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                transaction
            })

            return contractNumber[0].contractNumber
        } catch (error) {
            throw error
        }
    }

    /**
     * Method to fetch the ending time of a work order
     * @param {number} workOrderId
     * @param {string} workOrderResourceType
     * @param {*} transaction
     */
    static async getWorkOrderServiceSchedule (workOrderId, workOrderResourceType, transaction) {
        try {
            let workOrderScheduleQuery = `SELECT SchedulingSection.beginningTime as startTime, SchedulingSection.endingTime as endTime FROM SchedulingSection
            INNER JOIN ${workOrderResourceType} ON ${workOrderResourceType}.schedulingSectionId = SchedulingSection.id
            INNER JOIN WorkOrder ON WorkOrder.resourceId = ${workOrderResourceType}.id
            WHERE WorkOrder.id = ${workOrderId}`

            let workOrderScheduleEndTime = await models.sequelize.query(workOrderScheduleQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                transaction
            })
            return workOrderScheduleEndTime[0]
        } catch (error) {
            throw error
        }
    }

    /**
     * Method returns the payload for completed workorder
     * @param {date} completedOn
     * @param {date} workOrderEndTime
     * @param {object} workOrderPayload
     * @param {*} transaction
     */
    static async setCompletedOn (completedOn, workOrderEndTime, workOrderPayload, transaction) {
        if (moment(completedOn).isAfter(moment(workOrderEndTime))) {
            // Fetching the work order status code
            let statusId = await WorkOrderController.getStatusId('closed', transaction)
            return {
                ...workOrderPayload,
                completedOn,
                statusId
            }
        } else {
            throw new Error('WORK_ORDER_CANNOT_BE_COMPLETED_NOW')
        }
    }

    static async generateCrematoryLogId (crematoryRetortType, transaction) {
        let year = moment().format('YYYY')
        let workOrderDetailQuery = `select top 1 * from WorkOrderDetail where cremationId like '%${crematoryRetortType}%' order by cremationId desc`
        let workOrderDetail = await models.sequelize.query(workOrderDetailQuery, {
            type: models.sequelize.QueryTypes.SELECT, transaction
        })
        let oldCrematoryLogId = workOrderDetail.length ? _.get(workOrderDetail[0], 'cremationId', '') : ''
        let serialNumber = oldCrematoryLogId.substr(11)
        serialNumber = Number(serialNumber) + 1
        let newSerialNumber = serialNumber.toString().padStart(4, 0)
        let cremationId = `FY${year}${crematoryRetortType}_CR${newSerialNumber}`
        return cremationId
    }

    /**
     * This method is used to create or edit Resources assigned for a Work Order
     * @param {integer} workOrderId
     * @param {object} payload
     * @param {array} payload.employees
     * @param {number} payload.employees[0].employeeId
     * @param {string} payload.employees[0].startTime
     * @param {string} payload.employees[0].endTime
     * @param {string} payload.employees[0].task
     * @param {array} payload.resources
     * @param {number} payload.resources[0].id
     * @param {number} payload.resources[0].vehicleId
     * @param {number} payload.resources[0].employeeId
     * @param {number} payload.resources[0].startTime
     * @param {number} payload.resources[0].endTime
     * @param {array} payload.notes
     * @param {string} payload.notes.content
     * @param {boolean} payload.isWarningShown
     * @param {*} userId
     * @param {*} transaction
     */
    async createOrEditResourcesForWorkOrder (payload, userId) {
        let transaction = await models.sequelize.transaction()
        let hmisTransaction = await hmisDB.sequelize.transaction()
        try {
            let workOrder = await WorkOrderController.getWorkOrder(this.id, { scope: 'notDeleted' }, transaction)
            if (!payload.isWarningShown) {

                // Todo: TIMEOUT Issue - Need to revisit again

                // let warnings = await this.checkEmployeeScheduleForWorkOrder(payload, transaction)
                // if (warnings && warnings.length) {
                //     return { warnings }
                // }
            }

            // create or edit resources
            // Check if this employee exists
            let funeralDirector = await models.Employee.findOne({
                where: {
                    id: payload.funeralDirectorId
                },
                transaction
            })
            if (!funeralDirector) {
                // If no, throw an error saying Employee Not found
                throw new Error('EMPLOYEE_NOT_FOUND')
            }
            // If yes create a Employee Schedule for the funeral Director
            let assignedStatusId = await WorkOrderController.getStatusId('assigned', transaction)
            let workOrderPayload = {
                id: this.id,
                workOrderOwnerId: payload.funeralDirectorId,
                statusId: assignedStatusId
            }
            let workOrderServiceSchedule
            let workOrderServiceScheduleWithItemUsageInfo
            let propertyItemUsageIds = []
            let merchandiseItemUsageIds = []
            let disintermentPropertyItemUsageIds = []
            const SchedulingController = require('../schedulingController/schedulingController')
            const schedulingController = new SchedulingController()
            const personIdAndResourceId = await WorkOrderController.getPersonIdAndResourceId(this.id, transaction)
            let serviceName
            if (payload.serviceType === 'Cemetry') {
                let scheduledItemId = await models.sequelize.query(`select scs.itemUsageId from ScheduledCemeteryService scs
                inner join WorkOrder wo ON wo.resourceId = scs.id
                where wo.resourceType = 'ScheduledCemeteryService'
                and wo.id = ${this.id}`, { type: models.sequelize.QueryTypes.SELECT, transaction })
                workOrderServiceSchedule = await schedulingController.getScheduledCemeteryServiceDetails(personIdAndResourceId.personId, personIdAndResourceId.resourceId, transaction, !_.get(scheduledItemId, '[0].itemUsageId'))
                if (workOrderServiceSchedule.intermentInformationDetails && workOrderServiceSchedule.intermentInformationDetails.propertyDetails && workOrderServiceSchedule.serviceName !== 'Cemetery Witness Cremation Services' && workOrderServiceSchedule.serviceName !== 'Cemetery Cremation Service') propertyItemUsageIds = workOrderServiceSchedule.intermentInformationDetails.propertyDetails.map(item => item.itemUsageId)
                if (workOrderServiceSchedule.disintermentInformationDetails && workOrderServiceSchedule.disintermentInformationDetails.propertyDetails) disintermentPropertyItemUsageIds = workOrderServiceSchedule.disintermentInformationDetails.propertyDetails.map(item => item.itemUsageId)
                if (workOrderServiceSchedule.casketDetails && workOrderServiceSchedule.casketDetails.casket && workOrderServiceSchedule.casketDetails.casket.resourceType && workOrderServiceSchedule.casketDetails.casket.resourceType === 'ItemUsage') merchandiseItemUsageIds.push(workOrderServiceSchedule.casketDetails.casket.id)
                if (workOrderServiceSchedule.urnInformationDetails && workOrderServiceSchedule.urnInformationDetails.urn && workOrderServiceSchedule.urnInformationDetails.urn.resourceType && workOrderServiceSchedule.urnInformationDetails.urn.resourceType === 'ItemUsage') merchandiseItemUsageIds.push(workOrderServiceSchedule.urnInformationDetails.urn.id)
                if (workOrderServiceSchedule.vaultDetails && workOrderServiceSchedule.vaultDetails.vault && workOrderServiceSchedule.vaultDetails.vault.resourceType && workOrderServiceSchedule.vaultDetails.vault.resourceType === 'ItemUsage') merchandiseItemUsageIds.push(workOrderServiceSchedule.vaultDetails.vault.id)
                serviceName = workOrderServiceSchedule.serviceName
            } else {
                workOrderServiceSchedule = await WorkOrderController.getWorkOrderServiceSchedule(this.id, workOrder.resourceType, transaction)
                workOrderServiceScheduleWithItemUsageInfo = await schedulingController.getScheduledFuneralServiceDetails(personIdAndResourceId.personId, personIdAndResourceId.resourceId, transaction)
                if (workOrderServiceScheduleWithItemUsageInfo.casketDetails && workOrderServiceScheduleWithItemUsageInfo.casketDetails.casket && workOrderServiceScheduleWithItemUsageInfo.casketDetails.casket.resourceType && workOrderServiceScheduleWithItemUsageInfo.casketDetails.casket.resourceType === 'ItemUsage') merchandiseItemUsageIds.push(workOrderServiceScheduleWithItemUsageInfo.casketDetails.casket.id)
                if (workOrderServiceScheduleWithItemUsageInfo.urnInformationDetails && workOrderServiceScheduleWithItemUsageInfo.urnInformationDetails.urn && workOrderServiceScheduleWithItemUsageInfo.urnInformationDetails.urn.resourceType && workOrderServiceScheduleWithItemUsageInfo.urnInformationDetails.urn.resourceType === 'ItemUsage') merchandiseItemUsageIds.push(workOrderServiceScheduleWithItemUsageInfo.urnInformationDetails.urn.id)
                serviceName = workOrderServiceScheduleWithItemUsageInfo.serviceName
            }

            // Upsert Funeral Director in Employee Schedule
            let funeralDirectorSchedule = {
                workOrderId: this.id,
                startTime: workOrderServiceSchedule.startTime,
                endTime: workOrderServiceSchedule.endTime,
                employeeId: funeralDirector.id,
                staffType: 'apc'
            }

            // Upsert Employee Schedule
            let allEmployeeSchedule = [...payload.employees, funeralDirectorSchedule]
            // Get current employee schedule for work Order
            let existingEmployeeSchedule = await models.EmployeeSchedule.scope('notDeleted').findAll({
                where: {
                    workOrderId: this.id
                },
                transaction
            })
            // Delete the existing employeeSchedule rows which are not needed now
            if (existingEmployeeSchedule && existingEmployeeSchedule.length) {
                // Filter the ones with out locationItemId not matching
                let differenceItems = _.differenceWith(existingEmployeeSchedule, allEmployeeSchedule, (a1, a2) => a1.employeeId === a2.employeeId)
                // Delete these items
                await Promise.all(
                    differenceItems.map(async (item) => {
                        await models.EmployeeSchedule.update({
                            deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                            deletedBy: userId,
                            replacedBy: userId
                        }, {
                            where: {
                                id: item.id
                            },
                            transaction
                        })
                    })
                )
            }

            // upsert new ones
            await Promise.all(allEmployeeSchedule.map(async (employeeSchedule) => {
                // CHeck if Employee Exists
                let employeeRow = await models.Employee.findOne({
                    where: {
                        id: employeeSchedule.employeeId
                    },
                    transaction
                })
                if (!employeeRow) {
                    // If no, throw an error saying Employee Not found
                    throw new Error('EMPLOYEE_NOT_FOUND')
                }

                // Check if employee Schedule Exists
                let existingEmployeeSchedule = await models.EmployeeSchedule.scope('notDeleted').findOne({
                    where: {
                        workOrderId: this.id,
                        employeeId: employeeSchedule.employeeId
                    },
                    transaction
                })

                // Find a resource with this employee id on it
                let resource = _.find(payload.resources, { assignedEmployeeId: employeeSchedule.employeeId })
                let reservedResourceId = null
                if (resource) {
                    // Upsert Resource
                    const reservedResourcePayload = {
                        resourceType: 'Vehicles',
                        resourceId: resource.vehicleId,
                        reservationDate: resource.startTime,
                        startTime: resource.startTime,
                        endTime: resource.endTime,
                        blockStartTime: resource.startTime,
                        blockEndTime: resource.endTime,
                        id: resource.id
                    }
                    let reservedResource = await upsert('ReservedResource', reservedResourcePayload, transaction, { userId })
                    reservedResourceId = reservedResource.id
                }

                // Upsert workOrderTask
                let workOrderTaskPayload = {
                    id: _.get(existingEmployeeSchedule, 'workOrderTaskId', null),
                    name: employeeSchedule.task,
                    resourceReservationId: reservedResourceId
                }
                let workOrderTask = await upsert('WorkOrderTask', workOrderTaskPayload, transaction, { userId })
                let employeeSchedulePayload = {
                    employeeId: employeeSchedule.employeeId,
                    startTime: employeeSchedule.startTime,
                    endTime: employeeSchedule.endTime,
                    workOrderId: this.id,
                    workOrderTaskId: workOrderTask.id,
                    id: _.get(existingEmployeeSchedule, 'id', null),
                    staffType: employeeSchedule.staffType
                }
                await upsert('EmployeeSchedule', employeeSchedulePayload, transaction, { userId })
            }))
            const workOrderDetail = await models.WorkOrderDetail.scope('notDeleted').findOne({ where: { workOrderId: this.id }, transaction })

            // TODO: Check with hari if workOrderDetail and casketInfo is send in the payload only when it's of cemetery  service type and  can crematoryRetordId be added to it
            if (payload.serviceType === 'Cemetry') {
                if (!_.isEmpty(payload.casketInfo)) {
                    await upsert('WorkOrderCasketInfo', { ...payload.casketInfo, workOrderId: this.id }, transaction, { userId })
                }
            }

            if (!_.isEmpty(payload.received)) {
                let workOrderChamberRecord = await models.sequelize.query(`select * from WorkOrderChamberAccountabilityLog where workOrderId=${this.id} and deletedAt is null and deletedBy is null`, {
                    type: models.sequelize.QueryTypes.SELECT, transaction
                })
                let crematoryRetortId = _.get(payload, 'workOrderDetail.crematoryRetortId', null)
                if (crematoryRetortId) {
                    if ((workOrderChamberRecord.length && workOrderChamberRecord[0].logDate !== _.get(payload, 'received.logDate', null)) ||
                      (workOrderDetail && workOrderDetail.crematoryRetortId !== crematoryRetortId) ||
                      !workOrderChamberRecord.length) {
                        let cremationId
                        const retortRecord = await models.CrematoryRetorts.findOne({ where: { id: crematoryRetortId }, transaction })
                        if (retortRecord.name.includes('CRTBD')) {
                            cremationId = await WorkOrderController.generateCrematoryLogId('OM', transaction)
                        } else {
                            cremationId = await WorkOrderController.generateCrematoryLogId('CL', transaction)
                        }
                        payload.workOrderDetail.cremationId = cremationId
                    }
                }
            }

            if (!_.get(payload, 'workOrderDetail.id')) {
                const workOrderDetails = await models.WorkOrderDetail.scope('notDeleted').findOne({ where: { workOrderId: this.id }, transaction })
                if (workOrderDetails) {
                    throw new Error('WORKORDERDETAILS_ALREADY_EXISTS')
                }
            }

            if (payload.workOrderDetail && !_.isEmpty(payload.workOrderDetail)) {
                await upsert('WorkOrderDetail', { ...payload.workOrderDetail, workOrderId: this.id, createdBy: userId, updatedBy: userId }, transaction, { userId })
            }

            // If completedOn is sent and completedOn time is after the ending time of the work order, then add it to the worOrder table and change the status to closed
            if (payload.completedOn) {
                const workOrderDetails = await models.WorkOrderDetail.scope('notDeleted').findOne({ where: { workOrderId: this.id }, transaction })
                const serviceNames = ['Funeral Witness Cremation Service', 'Funeral Cremation Service', 'Cemetery Cremation Service', 'Wholesales Cremation Schedule', 'Cemetery Witness Cremation Services']
                if (serviceNames.indexOf(serviceName) !== -1 && !workOrderDetails.cremationId) {
                    throw new Error('CREMATION_ID_NOT_FOUND')
                }
                // Fetching the end time for the work order
                const ItemUsageController = require('../itemUsageController/itemUsageController')
                let workOrderServiceSchedulePersonId = _.get(workOrderServiceScheduleWithItemUsageInfo, 'person.id') ? _.get(workOrderServiceScheduleWithItemUsageInfo, 'person.id') : _.get(workOrderServiceSchedule, 'person.id')
                const itemUsageController = new ItemUsageController(workOrderServiceSchedulePersonId)
                const AgreementController = require('../agreementController/agreementController')
                const isMiscSales = (workOrderServiceSchedule.agreementType === AgreementController.TYPES['Miscellaneous Sales'])
                if (payload.serviceType === 'Cemetry') {
                    if (workOrderServiceSchedule.intermentInformationDetails && workOrderServiceSchedule.intermentInformationDetails.beginningTime) {
                        workOrderPayload = await WorkOrderController.setCompletedOn(payload.completedOn, _.get(workOrderServiceSchedule, 'intermentInformationDetails.beginningTime'), workOrderPayload, transaction)
                    }
                    if (workOrderServiceSchedule.disintermentInformationDetails && workOrderServiceSchedule.disintermentInformationDetails.beginningTime) {
                        workOrderPayload = await WorkOrderController.setCompletedOn(payload.completedOn, _.get(workOrderServiceSchedule, 'disintermentInformationDetails.beginningTime'), workOrderPayload, transaction)
                    }

                    if (!isMiscSales) {
                        // change status of item usage to used
                        await itemUsageController.updateItemUsageConfirm([workOrderServiceSchedule.itemUsageId, ...propertyItemUsageIds, ...merchandiseItemUsageIds], userId, false, true)

                        if (disintermentPropertyItemUsageIds.length) {
                            await ItemUsageController.unselectItemUsage([], disintermentPropertyItemUsageIds, userId, transaction)
                        }
                    }
                    // Update in hmis table (TB -> TI) and (TI -> TB)
                    if (workOrderServiceSchedule.intermentInformationDetails.temporaryBurialLocationId) {
                        await this.temporaryPropertyUpdateInHMIS(workOrderServiceSchedule.intermentInformationDetails.temporaryBurialLocationId, 'TI', userId, hmisTransaction)
                    } else if (workOrderServiceSchedule.intermentInformationDetails.temporaryDisintermentLocationId) {
                        await this.temporaryPropertyUpdateInHMIS(workOrderServiceSchedule.intermentInformationDetails.temporaryDisintermentLocationId, 'TB', userId, hmisTransaction)
                    } else { }

                    // updating the wholesale cremation status if all the workorders of the persons involved in the WSC are completed
                    // updating the addOns selected as used
                    // const AgreementController = require('../agreementController/agreementController')

                    if (workOrderServiceSchedule.agreementType === AgreementController.TYPES['Wholesale Cremation']) {
                        const WholeSaleCremationController = require('../miscSalesController/wholeSalesController')
                        await WholeSaleCremationController.updateTheStatusOfWholesale(workOrderServiceSchedule.contractNumber, workOrderPayload.id, transaction)
                        await itemUsageController.updateOtherItemsOfWholesaleAsUsed(userId, transaction)
                    }
                } else {
                    workOrderPayload = await WorkOrderController.setCompletedOn(payload.completedOn, moment(workOrderServiceSchedule.startTime), workOrderPayload, transaction)
                    // change status of item usage to used
                    if (merchandiseItemUsageIds.length && !isMiscSales) await itemUsageController.updateItemUsageConfirm([...merchandiseItemUsageIds], userId, false, true)
                }
                // remove the decedents associated to particular property
                if (workOrderServiceSchedule.serviceName === 'Cemetery Disinterment Service') {
                    await this.propertyRemoveDecedenEvent(workOrderServiceSchedule, hmisTransaction, userId, transaction)
                }
            }

            // Upsert WorkOrder
            await upsert('WorkOrder', workOrderPayload, transaction, { userId })

            // Creating or updating the chamber accountability log for a work order
            let chamberAccountabilityItem = ['received', 'chamberPlacement', 'chamberRemoval', 'processed', 'released']
            await Promise.all(chamberAccountabilityItem.map(async (chamberItem) => {
                if (payload[chamberItem] && !_.isEmpty(payload[chamberItem])) {
                    // Checking if an entry exists for the accountability type in the table
                    let chamberLogQuery = `SELECT *
                    FROM WorkOrderChamberAccountabilityLog
                    WHERE WorkOrderChamberAccountabilityLog.workOrderId =:workOrderId
                    AND WorkOrderChamberAccountabilityLog.type =:type
                    AND WorkOrderChamberAccountabilityLog.replacedBy IS NULL
                    AND WorkOrderChamberAccountabilityLog.deletedBy IS NULL`

                    let chamberLogDetails = await models.sequelize.query(chamberLogQuery, {
                        type: models.sequelize.QueryTypes.SELECT,
                        replacements: {
                            workOrderId: this.id,
                            type: chamberItem
                        },
                        transaction
                    })
                    // If its exists then update the replacedAt and deletedAt for that entry
                    // If it does not exist then add the entry into the table
                    let receivedPayload = {
                        logDate: payload[chamberItem].logDate,
                        weight: payload[chamberItem].weight,
                        operator: payload[chamberItem].operator,
                        chamberNumber: payload[chamberItem].chamberId
                    }
                    if (chamberItem === 'released') {
                        receivedPayload.clFacilityLocationId = payload[chamberItem].clFacilityLocationId
                        receivedPayload.serviceLocationId = payload[chamberItem].serviceLocationId
                    }

                    if (chamberItem === 'processed') {
                        receivedPayload.urnSelection = payload[chamberItem].urnSelection
                        receivedPayload.urnDeliveryDate = payload[chamberItem].urnDeliveryDate
                    }

                    let chamberAccountabilityLogPayload = {
                        ...receivedPayload,
                        workOrderId: this.id,
                        type: chamberItem
                    }
                    if (chamberLogDetails.length) {
                        chamberAccountabilityLogPayload = {
                            ...chamberLogDetails[0],
                            ...receivedPayload
                        }
                    }
                    await upsert('WorkOrderChamberAccountabilityLog', chamberAccountabilityLogPayload, transaction, { userId })
                }
            }))

            let cremationServices = [
                'Funeral Cremation Service',
                'Funeral Witness Cremation Service',
                'Cemetery Cremation Service',
                'Wholesales Cremation Schedule',
                'Cemetery Witness Cremation Services'
            ]
            // If the work order belongs to any of the above mentioned services, adding the details into the PNTransferDetails
            if (cremationServices.includes(serviceName)) {
                let crematoryAuthorityId = _.get(payload, 'workOrderDetail.crematoryRetortId', null)
                // Only inserting when there are service start time and crematoryAuthority
                let workOrderServiceStartDate = _.get(workOrderServiceSchedule, 'startTime', null) || _.get(workOrderServiceSchedule, 'intermentInformationDetails.beginningTime', null) || _.get(workOrderServiceSchedule, 'disintermentInformationDetails.beginningTime', null)
                if (workOrderServiceStartDate && crematoryAuthorityId) {
                    let transferToDetails = []
                    if (crematoryAuthorityId) {
                        // Assigning the organization name based on the crematory authority
                        let crematoryAuthorityName = await models.CrematoryRetorts.findOne({ where: { id: crematoryAuthorityId }, transaction })
                        let organizationName = null
                        if (crematoryAuthorityName.name === 'Product Name Cremation Center CRTBD') {
                            organizationName = 'OLIVET MEMORIAL PARK & CREMATORY'
                        } else if (crematoryAuthorityName.name === 'Product Name Cemetery Association Crematory CR197') {
                            organizationName = 'Product Name CEMETERY ASSOCIATION CREMATORY'
                        }

                        // Fetching the transfer to details for the pn transfer details payload
                        if (organizationName) {
                            let transferToDetailsQuery = `
                            SELECT
                            Place.id AS placeId,
                            Organization.id AS organizationId,
                            Organization.name,
                            Organization.organizationTypeId,
                            Organization.phoneNumber,
                            Address.id AS addressId,
                            Address.line1,
                            Address.line2,
                            Address.city,
                            Address.state,
                            Address.county,
                            Address.country,
                            Address.zipcode
                            FROM Place 
                            INNER JOIN Address ON Place.addressId = Address.id
                            INNER JOIN Organization ON Organization.id = Place.organizationId
                            INNER JOIN OrganizationType ON Organization.organizationTypeId = OrganizationType.id
                            WHERE Organization.name =:organizationName AND OrganizationType.type = 'Crematory'`

                            transferToDetails = await models.sequelize.query(transferToDetailsQuery, {
                                type: models.sequelize.QueryTypes.SELECT,
                                replacements: {
                                    organizationName
                                },
                                transaction
                            })
                        }
                    }

                    // Populating the payload for the pn transfer details
                    let anTransferPayload = {}
                    anTransferPayload.transferType = getKey(seedValues.seed.TransferType, 'Crematory')
                    anTransferPayload.neededByDate = workOrderServiceStartDate

                    // Conditionally adding the transferToPlace key when there is transferToDetails
                    if (transferToDetails.length) {
                        anTransferPayload.transferToPlace = {
                            id: _.get(transferToDetails, '[0].placeId', null),
                            organization: {
                                id: _.get(transferToDetails, '[0].organizationId', null),
                                name: _.get(transferToDetails, '[0].name', null),
                                organizationTypeId: _.get(transferToDetails, '[0].organizationTypeId', null),
                                phoneNumber: _.get(transferToDetails, '[0].phoneNumber', null)
                            },
                            address: {
                                id: _.get(transferToDetails, '[0].addressId', null),
                                line1: _.get(transferToDetails, '[0].line1', null),
                                line2: _.get(transferToDetails, '[0].line2', null),
                                city: _.get(transferToDetails, '[0].city', null),
                                state: _.get(transferToDetails, '[0].state', null),
                                county: _.get(transferToDetails, '[0].county', null),
                                country: _.get(transferToDetails, '[0].country', null),
                                zipcode: _.get(transferToDetails, '[0].zipcode', null)
                            }
                        }
                    }

                    let workOrderTypeQuery = `
                    SELECT
                    resourceType,
                    resourceId
                    FROM WorkOrder
                    WHERE id =:workOrderId
                    AND deletedAt IS NULL
                    AND deletedBy IS NULL
                    `

                    let workOrderType = await models.sequelize.query(workOrderTypeQuery, {
                        type: models.sequelize.QueryTypes.SELECT,
                        replacements: {
                            workOrderId: this.id
                        },
                        transaction
                    })

                    let workOrderPersonId = null
                    let crematoryPersonRemainsTransferId = null

                    if (workOrderType.length) {
                        let resourceType = _.get(workOrderType, '[0].resourceType', null)
                        let resourceId = _.get(workOrderType, '[0].resourceId', null)
                        let workOrderDecedentDetail = []
                        if (resourceType && resourceId) {
                            let workOrderDecedentDetailQuery = `
                            SELECT
                            personId
                            FROM ${resourceType}
                            WHERE id =:resourceId
                            AND deletedBy IS NULL
                            AND deletedAt IS NULL`

                            workOrderDecedentDetail = await models.sequelize.query(workOrderDecedentDetailQuery, {
                                type: models.sequelize.QueryTypes.SELECT,
                                replacements: {
                                    resourceId
                                },
                                transaction
                            })
                        }
                        workOrderPersonId = _.get(workOrderDecedentDetail, '[0].personId', null)
                    }

                    // Inserting the record into pn transfer details table
                    if (workOrderPersonId) {
                        // Checking if there are any personRemainsTransfer details which got manually added.
                        let crematoryPersonRemainsTransferIdQuery = `
                                SELECT
                                id
                                FROM PersonRemainsTransfer
                                WHERE personId =:personId
                                AND transferType =:transferType
                                AND deletedAt IS NULL
                                AND deletedBy IS NULL
                                ORDER BY id DESC`
                        let crematoryPersonRemainsTransferIdDetail = await models.sequelize.query(crematoryPersonRemainsTransferIdQuery, {
                            type: models.sequelize.QueryTypes.SELECT,
                            replacements: {
                                personId: workOrderPersonId,
                                transferType: getKey(seedValues.seed.TransferType, 'Crematory')
                            },
                            transaction
                        })
                        crematoryPersonRemainsTransferId = _.get(crematoryPersonRemainsTransferIdDetail, '[0].id', null)
                        // Adding the personRemainsTransferId into the payload if it exists to the payload to update the details, rather than creatiing a new one.
                        let personTransferId = crematoryPersonRemainsTransferId
                        if (workOrderType.length && personTransferId) {
                            anTransferPayload.id = personTransferId
                        }
                        const anRemainsController = new ANRemainsController(workOrderPersonId)
                        let personRemainsTransferDetails = await anRemainsController.createOrEditTransfer(anTransferPayload)
                        // If the personRemainsTransferId does not exist, then adding it to the corresponding workOrderChamberAccountabilityLog
                        if (workOrderType.length && !personTransferId) {
                            await models.sequelize.query(`
                            UPDATE WorkOrder
                            SET personRemainsTransferId =:personRemainsTransferId
                            WHERE id=:workOrderId`,
                            {
                                type: models.sequelize.QueryTypes.UPDATE,
                                replacements: {
                                    personRemainsTransferId: personRemainsTransferDetails.id,
                                    workOrderId: this.id
                                },
                                transaction
                            })
                        }
                    }
                }
            }

            // Create or update Decedent and Cremation Details
            if (payload.decedentAndCremationDetails) {
                // Checking if an entry exists in DecedentAndCremationDetail table
                let decedentAndCremationDetailQuery = `SELECT *
                FROM DecedentAndCremationDetails
                WHERE DecedentAndCremationDetails.workOrderId =:workOrderId`

                let decedentAndCremationDetail = await models.sequelize.query(decedentAndCremationDetailQuery, {
                    type: models.sequelize.QueryTypes.SELECT,
                    replacements: {
                        workOrderId: this.id
                    },
                    transaction
                })

                // If its exists then update the replacedAt and deletedAt for that entry
                // If it does not exist then add the entry into the table
                let receivedPayload = {
                    weightOver: _.get(payload, 'decedentAndCremationDetails.weightOver'),
                    witness: _.get(payload, 'decedentAndCremationDetails.witness'),
                    witnessCount: _.get(payload, 'decedentAndCremationDetails.witnessCount'),
                    expedite: _.get(payload, 'decedentAndCremationDetails.expedite')
                }
                let decedentAndCremationDetailPayload = {
                    ...receivedPayload,
                    workOrderId: this.id
                }
                if (decedentAndCremationDetail.length) {
                    decedentAndCremationDetailPayload = {
                        ...decedentAndCremationDetail[0],
                        ...receivedPayload
                    }
                }
                await upsert('DecedentAndCremationDetails', decedentAndCremationDetailPayload, transaction, { userId })
            }

            if (payload.notes) {
                const noteCategory = await models.NoteCategory.findOne({ where: { name: 'Work Order' }, transaction })
                await Promise.all(
                    payload.notes.map(async (note) => {
                        note.resourceType = 'WorkOrder'
                        if (noteCategory) {
                            note.categoryId = _.get(noteCategory, 'id')
                        }
                        note.resourceId = this.id
                        note.userId = userId
                        await NotesController.createNote(note, transaction)
                    })
                )
            }

            await transaction.commit()
            await hmisTransaction.commit()
            let res = await WorkOrderController.getWorkOrderDetails(this.id)
            const { queueNames, queues } = require('../../../appQueues')
            const workOrderEmailWorker = queues[queueNames.email_queue]
            let contractNumber
            if (res.resourceType === 'ScheduledCemeteryService') {
                contractNumber = await WorkOrderController.getContractNumber(res.resourceId)
            } else {
                contractNumber = res.schedulingDetails.contractNumber
            }
            res.schedulingDetails.contractNumber = contractNumber
            let workOrderEmailData
            if (payload.completedOn) {
                workOrderEmailData = {
                    workOrderDetail: res,
                    status: 'Completed',
                    timezone: payload.timezone
                }
            } else {
                workOrderEmailData = {
                    workOrderDetail: res,
                    status: 'Assigned',
                    timezone: payload.timezone
                }
            }
            // sending data to webcem
            const webCemQueue = queues[queueNames.webCemQueue]
            if (workOrderServiceSchedule.serviceName !== 'Cemetery Witness Cremation Services' && workOrderServiceSchedule.serviceName !== 'Cemetery Cremation Service') {
                if (payload.completedOn && workOrderServiceSchedule.intermentInformationDetails) {
                    let intInfo = workOrderServiceSchedule.intermentInformationDetails
                    if (intInfo.temporaryBurialLocation) {
                        let webCemData = {
                            event: 'property.save',
                            payload: {
                                lotSellUnitId: intInfo.temporaryBurialLocation.Lot_Sell_Unit_ID,
                                personId: workOrderServiceSchedule.person.id,
                                userId: userId
                            }
                        }
                        webCemQueue.add('webCemQueue', webCemData)
                    } else {
                        if (propertyItemUsageIds) {
                            const itemUsageItems = await models.ItemUsage.findAll({
                                where: { id: { [Op.in]: propertyItemUsageIds } }
                            })
                            itemUsageItems.map(async (item) => {
                                let agreementPropertyId = item.resourceId
                                let property = await models.AgreementProperty.scope('propertyScope').findOne({
                                    where: { id: agreementPropertyId }
                                })
                                let webCemData = {
                                    event: 'property.decedents.add',
                                    payload: {
                                        personId: workOrderServiceSchedule.person.id,
                                        propertyId: property.propertyId,
                                        lotSellUnitId: property.property.lotSellUnitId,
                                        lotSpaceId: item.lotSpaceId,
                                        userId: userId
                                    }
                                }
                                webCemQueue.add('webCemQueue', webCemData)
                            })
                        }
                    }
                } else {
                    let webCemData = {
                        event: 'decedent.save',
                        payload: {
                            resourceId: res.resourceId,
                            resourceType: res.resourceType,
                            userId: userId,
                            triggerPoint: 'WorkOrder'
                        }
                    }
                    webCemQueue.add('webCemQueue', webCemData)
                }
            } else {
                let webCemData = {
                    event: 'decedent.save',
                    payload: {
                        resourceId: res.resourceId,
                        userId: userId,
                        resourceType: res.resourceType,
                        triggerPoint: 'WorkOrder'
                    }
                }
                webCemQueue.add('webCemQueue', webCemData)
            }

            // send tent requirement email
            const services = [
                'Reception Center Service',
                'Funeral Witness Cremation Service',
                'Funeral Cremation Service'
            ]

            if (payload.serviceType === 'Funeral' && !services.includes(_.get(workOrderServiceScheduleWithItemUsageInfo, 'serviceName')) && (_.get(workOrderDetail, 'isTentRequired', false) !== _.get(payload, 'workOrderDetail.isTentRequired', false))) {
                let workOrderTentDetails = {
                    isTentRequired: payload.workOrderDetail.isTentRequired ? 'Yes' : 'No',
                    serviceName: _.get(workOrderServiceScheduleWithItemUsageInfo, 'serviceName', ''),
                    schedulingTime: workOrderServiceSchedule.startTime,
                    decedentName: _.get(workOrderServiceScheduleWithItemUsageInfo, 'person.firstName', '') + ' ' + _.get(workOrderServiceScheduleWithItemUsageInfo, 'person.middleName', '') + ' ' + _.get(workOrderServiceScheduleWithItemUsageInfo, 'person.lastName', ''),
                    workOrderNumber: workOrder.onePortalWorkOrderId,
                    timezone: payload.timezone
                }

                workOrderEmailWorker.add('WorkOrderTentEmail', workOrderTentDetails)
            }
            workOrderEmailWorker.add('WorkOrderEmail', workOrderEmailData)

            /**
             * Syncing scheduling details to FAA
             */
            // const cremationController = new CremationSyncController(_.get(res, 'schedulingDetails.person.id'))
            // await cremationController.updateCremationServices()
            faaWorker.addQueue({ personId: _.get(res, 'schedulingDetails.person.id'), faaWorker_event: 'syncCremationData' })
            return res
        } catch (error) {
            await hmisTransaction.rollback()
            await transaction.rollback()
            throw error
        }
    }
    async propertyRemoveDecedenEvent (workOrderServiceSchedule, hmisTransaction, userId, transaction) {
        const { queueNames, queues } = require('../../../appQueues')
        const webCemQueue = queues[queueNames.webCemQueue]
        let propertiesArray = []
        if (workOrderServiceSchedule.intermentInformationDetails.temporaryDisintermentLocation) {
            // if temporary burial properties are peresent
            const queryResult = await this.getTempPropertyDataFromHMIS(workOrderServiceSchedule.intermentInformationDetails.temporaryDisintermentLocation.Lot_Sell_Unit_ID, hmisTransaction)
            workOrderServiceSchedule.intermentInformationDetails.temporaryDisintermentLocation.lotSpaceId = queryResult.Lot_Space_ID
            const property = workOrderServiceSchedule.intermentInformationDetails.temporaryDisintermentLocation
            propertiesArray.push(property)
            const dataToSend = {
                event: 'property.decedents.remove',
                payload: {
                    cl_ref: property.Lot_Sell_Unit_ID,
                    propertyDetails: propertiesArray,
                    person: workOrderServiceSchedule.person,
                    contractNumber: workOrderServiceSchedule.contractNumber,
                    addendumNumber: workOrderServiceSchedule.addendumNumber ? workOrderServiceSchedule.addendumNumber : '',
                    userId: userId
                }
            }
            // Add data to webcem queue
            webCemQueue.add('webCemQueue', dataToSend)
            const webCemData = {
                event: 'property.save',
                payload: {
                    lotSellUnitId: property.Lot_Sell_Unit_ID,
                    userId: userId
                }
            }
            webCemQueue.add('webCemQueue', webCemData)
        } else {
            // If original properties are present
            propertiesArray = workOrderServiceSchedule.disintermentInformationDetails.propertyDetails
            let propertyArray = _.groupBy(propertiesArray, 'lotSellUnitId')
            for (let item in propertyArray) {
                const dataToSend = {
                    event: 'property.decedents.remove',
                    payload: {
                        cl_ref: item,
                        propertyDetails: propertyArray[item],
                        person: workOrderServiceSchedule.person,
                        contractNumber: workOrderServiceSchedule.contractNumber,
                        addendumNumber: workOrderServiceSchedule.addendumNumber ? workOrderServiceSchedule.addendumNumber : '',
                        userId: userId
                    }
                }
                // Add data to webcem queue
                // fetch property by lotSellUnitId
                let [property] = await models.Property.findAll({
                    where: { lotSellUnitId: item },
                    include: [
                        {
                            model: models.AgreementProperty,
                            as: 'agreementProperties',
                            where: {
                                deletedAt: null,
                                deletedBy: null
                            },
                            required: true
                        }
                    ],
                    transaction
                })
                let [agmntProperty] = property.agreementProperties
                const webCemData = {
                    event: 'property.save',
                    propertyId: property.id,
                    userId: userId,
                    status: 'Reserved'
                }
                // Check HMIS Sync is done or not
                let commonInclude = [
                    {
                        model: models.HMISDataSyncStatus,
                        as: 'HMISDataSyncStatus',
                        where: { name: 'Success' },
                        required: true
                    }
                ]
                let hmisSync
                if (agmntProperty && agmntProperty.addendumId) {
                    [hmisSync] = await models.HMISAddendumDataSync.findAll({
                        where: { addendumId: agmntProperty.addendumId },
                        include: commonInclude,
                        transaction
                    })
                } else {
                    [hmisSync] = await models.HMISDataSync.findAll({
                        where: { agreementId: agmntProperty.agreementId },
                        include: commonInclude,
                        transaction
                    })
                }
                if (hmisSync) {
                    webCemData.status = 'Sold'
                }
                // Check ItemUsage of Property
                let [itemUsage] = await models.ItemUsage.findAll({
                    where: { resourceType: 'AgreementProperty', resourceId: agmntProperty.id, deletedAt: null, deletedBy: null },
                    include: [
                        {
                            model: models.ItemUsageStatus,
                            as: 'status',
                            where: { status: 'Used' }
                        }
                    ],
                    transaction
                })
                if (itemUsage) {
                    webCemData.status = 'Occupied'
                }
                webCemQueue.add('webCemQueue', dataToSend)
                webCemQueue.add('webCemQueue', webCemData)
            }
        }
    }
    async getTempPropertyDataFromHMIS (LotSellUnitId, transaction) {
        const temporaryBurialPropertyFromHMIS = await hmisDB.sequelize.query(`SELECT ls.Lot_Space_ID,ls.Section_Cd, lsu.Lot_Sell_Unit_ID FROM lot_space as ls INNER JOIN Lot_Sell_Unit as lsu ON lsu.Lot_Sell_Unit_ID = ls.Lot_Sell_Unit_ID
        WHERE lsu.LSU_Status_Cd IN ('TB', 'TI') AND ls.Sequence = 1 AND lsu.Lot_Sell_Unit_ID =:LotSellUnitId`, {
            type: hmisDB.sequelize.QueryTypes.SELECT,
            replacements: {
                LotSellUnitId
            },
            transaction
        })
        let result = null
        if (temporaryBurialPropertyFromHMIS.length) {
            // eslint-disable-next-line no-const-assign
            [result] = temporaryBurialPropertyFromHMIS
        }
        return result
    }

    /**
     * This method is used to check the schedule of an employee for a work order
     * @param {array} payload
     * @param {*} transaction
     */
    async checkEmployeeScheduleForWorkOrder (payload, transaction) {
        try {
            // Note: start time and end time should be of data type Date.
            let employeeAvailability = []
            await Promise.all(payload.employees.map(async (employee) => {
                let employeeScheduleQuery = `SELECT EmployeeSchedule.employeeId,EmployeeSchedule.workOrderId, CONCAT('Employee ', Employee.name,' is assigned to another Work order during the time you chose.') as warning
                FROM EmployeeSchedule
                INNER JOIN Employee ON Employee.id = EmployeeSchedule.employeeId
                WHERE EmployeeSchedule.employeeId = ${employee.employeeId} AND  EmployeeSchedule.deletedAt is NULL AND EmployeeSchedule.deletedBy is NULL AND EmployeeSchedule.workOrderId <> ${this.id} AND (('${employee.startTime} ' 
                BETWEEN EmployeeSchedule.startTime AND EmployeeSchedule.endTime) OR ('${employee.endTime}' BETWEEN EmployeeSchedule.startTime AND EmployeeSchedule.endTime))
                GROUP BY EmployeeSchedule.employeeId, Employee.name,EmployeeSchedule.workOrderId`

                let employeeSchedule = await models.sequelize.query(employeeScheduleQuery, {
                    type: models.sequelize.QueryTypes.SELECT,
                    transaction
                })

                employeeAvailability = [...employeeAvailability, ...employeeSchedule]
            }))

            return employeeAvailability
        } catch (error) {
            throw error
        }
    }

    /**
     * This method fetches the personId and the resource id for the corresponding work order id
     * @param {number} workOrderId
     * @param {*} transaction
     */
    static async getPersonIdAndResourceId (workOrderId, transaction) {
        try {
            // Query to fetch the resourceType
            let resourceTypeQuery = `SELECT WorkOrder.resourceType FROM WorkOrder
            WHERE WorkOrder.id = ${workOrderId}`

            let resourceTypeResult = await models.sequelize.query(resourceTypeQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                transaction
            })

            let { resourceType } = resourceTypeResult[0]

            // Query to fetch the personId and the resourceId
            let personIdAndResourceIdQuery = `SELECT WorkOrder.resourceId, ${resourceType}.personId  FROM WorkOrder
            INNER JOIN ${resourceType} ON WorkOrder.resourceId = ${resourceType}.id
            WHERE WorkOrder.id = ${workOrderId}`

            let personIdAndResourceId = await models.sequelize.query(personIdAndResourceIdQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                transaction
            })

            // Validation to check if the personId and resourceId exists.
            if (!personIdAndResourceId.length || !personIdAndResourceId[0].personId || !personIdAndResourceId[0].resourceId) throw new Error('SCHEDULING_INFORMATION_NOT_FOUND')

            return personIdAndResourceId[0]
        } catch (error) {
            throw error
        }
    }

    /**
     * This method fetches employeeDetails for a work order id
     * @param {number} workOrderId
     * @param {*} transaction
     * @param {boolean} cancelledStatus
     */
    static async getEmployeeDetails (workOrderId, transaction, cancelledStatus = false) {
        try {
            let conditionalQuery = ''
            if (!cancelledStatus) {
                conditionalQuery = `AND EmployeeSchedule.deletedBy IS NULL AND EmployeeSchedule.deletedAt IS NULL`
            }
            // Query to fetch the employee detals
            let employeeDetailsQuery = `SELECT EmployeeSchedule.employeeId, Employee.name AS employeeName, Employee.email, EmployeeSchedule.startTime, EmployeeSchedule.endTime, EmployeeSchedule.staffType, WorkOrderTask.id AS workOrderTaskId, WorkOrderTask.name AS workOrderTaskName, WorkOrderTask.resourceReservationId
            FROM EmployeeSchedule
            INNER JOIN Employee ON Employee.id = EmployeeSchedule.employeeId
            INNER JOIN WorkOrderTask ON WorkOrderTask.id = EmployeeSchedule.workOrderTaskId
            WHERE EmployeeSchedule.workOrderId = ${workOrderId} ${conditionalQuery}
            AND EmployeeSchedule.replacedBy IS NULL`

            let employeeDetails = await models.sequelize.query(employeeDetailsQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                transaction
            })

            return employeeDetails
        } catch (error) {
            throw error
        }
    }

    /**
     * This method fetches vehicleDetails for a work order id and the corresponding vehicleType
     * @param {number} workOrderId
     * @param {string} vehicleType
     * @param {*} transaction
     * @param {boolean} cancelledStatus
     */
    static async getVehicleDetails (workOrderId, vehicleType, transaction, cancelledStatus) {
        try {
            let employeeDetails = await WorkOrderController.getEmployeeDetails(workOrderId, transaction, cancelledStatus)

            let resourceReservationIds = []
            employeeDetails.forEach((task) => {
                if (task.resourceReservationId) {
                    resourceReservationIds.push(task.resourceReservationId)
                }
            })

            // Query to fetch the vehicle details
            let vehicleDetailsQuery = `SELECT ReservedResource.id AS reservedResourceId, ReservedResource.startTime , ReservedResource.endTime, Vehicles.id AS vehicleId, Vehicles.name AS vehicleName
            FROM ReservedResource
            INNER JOIN Vehicles ON Vehicles.id = ReservedResource.resourceId
            WHERE ReservedResource.id IN (${resourceReservationIds.length ? resourceReservationIds : 'NULL'}) AND ReservedResource.resourceType = 'Vehicles' AND Vehicles.type='${vehicleType}'`

            let vehicleDetails = await models.sequelize.query(vehicleDetailsQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                transaction
            })

            let completeVehicleInfo = []

            vehicleDetails.forEach((vehicleInfo) => {
                employeeDetails.forEach((employee) => {
                    if (vehicleInfo.reservedResourceId === employee.resourceReservationId) {
                        completeVehicleInfo = [
                            ...completeVehicleInfo,
                            {
                                id: vehicleInfo.reservedResourceId,
                                vehicleId: vehicleInfo.vehicleId,
                                vehicleName: vehicleInfo.vehicleName,
                                startTime: vehicleInfo.startTime,
                                endTime: vehicleInfo.endTime,
                                employeeId: employee.employeeId,
                                employeeName: employee.employeeName
                            }
                        ]
                    }
                })
            })

            return completeVehicleInfo
        } catch (error) {
            throw error
        }
    }

    /**
     * This method fetches the DecedentAndCremationDetails for a work order
     * @param {number} workOrderId
     * @param {boolean} cancelledStatus
     * @param {*} transaction
     */
    static async getDecedentAndCremationDetails (workOrderId, cancelledStatus = false, transaction) {
        try {
            let filterQuery = ''

            if (!cancelledStatus) {
                filterQuery = `
                AND DecedentAndCremationDetails.deletedAt IS NULL
                AND DecedentAndCremationDetails.deletedBy IS NULL`
            }
            // Query to fetch the DecedentAndCremationDetails
            let decedentAndCremationDetailQuery = `SELECT
            weightOver,
            witness,
            witnessCount,
            expedite
            FROM DecedentAndCremationDetails
            WHERE workOrderId =:workOrderId
            AND replacedBy IS NULL
            ${filterQuery}`

            let decedentAndCremationDetails = await models.sequelize.query(decedentAndCremationDetailQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    workOrderId
                },
                transaction
            })

            return {
                decedentAndCremationDetails: decedentAndCremationDetails[0]
            }
        } catch (error) {
            throw error
        }
    }

    /**
     * This method fetches the chamber accountability log for a work order
     * @param {number} workOrderId
     * @param {boolean} cancelledStatus
     */
    static async getChamberLog (workOrderId, cancelledStatus = false, transaction) {
        try {
            let filterQuery = ''

            if (!cancelledStatus) {
                filterQuery = `
                AND WorkOrderChamberAccountabilityLog.deletedAt IS NULL
                AND WorkOrderChamberAccountabilityLog.deletedBy IS NULL`
            }
            // Query to fetch the chamber accountablility log
            let chamberLogQuery = `SELECT
            WorkOrderChamberAccountabilityLog.type,
            WorkOrderChamberAccountabilityLog.logDate,
            WorkOrderChamberAccountabilityLog.weight,
            WorkOrderChamberAccountabilityLog.serviceLocationId,
            WorkOrderChamberAccountabilityLog.clFacilityLocationId,
            WorkOrderChamberAccountabilityLog.urnSelection,
            WorkOrderChamberAccountabilityLog.urnDeliveryDate,
            Employee.id AS operatorId,
            Employee.name AS operatorName,
            CrematoryRetorts.id AS chamberId,
            CrematoryRetorts.name AS crematoryName,
            CrematoryRetorts.chamber AS crematoryChamber
            FROM WorkOrder
            INNER JOIN WorkOrderChamberAccountabilityLog ON WorkOrderChamberAccountabilityLog.workOrderId = WorkOrder.id
            LEFT JOIN Employee ON Employee.id = WorkOrderChamberAccountabilityLog.operator
            LEFT JOIN CrematoryRetorts ON CrematoryRetorts.id = WorkOrderChamberAccountabilityLog.chamberNumber
            WHERE WorkOrder.id =:workOrderId
            AND WorkOrderChamberAccountabilityLog.replacedBy IS NULL
            ${filterQuery}`

            let chamberLogDetails = await models.sequelize.query(chamberLogQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    workOrderId
                },
                transaction
            })

            let chamberDetails = {}

            await Promise.all(await chamberLogDetails.map(async (chamber) => {
                chamberDetails[chamber.type] = {
                    'date': chamber.logDate,
                    'weight': chamber.weight,
                    'chamberId': chamber.chamberId,
                    'crematoryName': chamber.crematoryName,
                    'crematoryChamber': chamber.crematoryChamber,
                    'operatorId': chamber.operatorId,
                    'operatorName': chamber.operatorName
                }
                if (chamber.type === 'processed') {
                    chamberDetails[chamber.type].urnSelection = chamber.urnSelection
                    chamberDetails[chamber.type].urnDeliveryDate = chamber.urnDeliveryDate
                }

                if (chamber.type === 'released') {
                    chamberDetails[chamber.type].clFacilityLocationDetails = null
                    chamberDetails[chamber.type].serviceLocationDetails = null
                    if (chamber.clFacilityLocationId) {
                        let clFacilityLocationDetails = await models.sequelize.query(`select * from Location where id=${chamber.clFacilityLocationId}`, { type: models.sequelize.QueryTypes.SELECT, transaction })
                        chamberDetails[chamber.type].clFacilityLocationDetails = clFacilityLocationDetails[0]
                    }
                    if (chamber.serviceLocationId) {
                        let serviceLocationQuery = `select Place.id as placeId, * from Place  
                        inner join Organization org on org.id=Place.organizationId
                        inner join OrganizationType orgType on orgType.id=org.organizationTypeId
                        inner join Address  on Address.id=Place.addressId where Place.id=${chamber.serviceLocationId}`
                        let serviceLocationDetails = await models.sequelize.query(serviceLocationQuery, { type: models.sequelize.QueryTypes.SELECT, transaction })

                        let locationDetails = {
                            name: _.get(serviceLocationDetails[0], 'name', ''),
                            placeId: _.get(serviceLocationDetails[0], 'placeId', ''),
                            type: _.get(serviceLocationDetails[0], 'type', ''),
                            address: {
                                id: _.get(serviceLocationDetails[0], 'id', ''),
                                country: _.get(serviceLocationDetails[0], 'country', ''),
                                county: _.get(serviceLocationDetails[0], 'county', ''),
                                line1: _.get(serviceLocationDetails[0], 'line1', ''),
                                line2: _.get(serviceLocationDetails[0], 'line2', ''),
                                state: _.get(serviceLocationDetails[0], 'state', ''),
                                zipCode: _.get(serviceLocationDetails[0], 'zipcode', ''),
                                city: _.get(serviceLocationDetails[0], 'city', '')
                            }
                        }
                        chamberDetails[chamber.type].serviceLocationDetails = locationDetails
                    }
                }
            }))

            return chamberDetails
        } catch (error) {
            throw error
        }
    }

    /**
     * This method fetches the details for the corresponding work order id
     * @param {number} workOrderId
     * @param {*} transaction
     */
    static async getWorkOrderDetails (workOrderId, transaction) {
        try {
            // Validation to check if the worker order id exists
            let workOrder = await WorkOrderController.getWorkOrder(workOrderId, { scope: '' }, transaction)

            // Importing it inside the function to prevent circular dependency
            const SchedulingController = require('../schedulingController/schedulingController')

            // Get Scheduled Service Info
            const personIdAndResourceId = await WorkOrderController.getPersonIdAndResourceId(workOrderId, transaction)
            const schedulingController = new SchedulingController()

            let cancelledStatus = Boolean(workOrder.deletedAt || workOrder.deletedBy)

            let schedulingDetails
            let workOrderDetails
            let workOrderCasketInfo
            // Scheduling details would be conditional depending on the resuorceType of the work order
            // TODO: Check with Hari how to handle the workOrderDetail key in the response now that it's available for funeral as well.
            if (workOrder.resourceType === 'ScheduledFuneralService') {
                schedulingDetails = await schedulingController.getScheduledFuneralServiceDetails(personIdAndResourceId.personId, personIdAndResourceId.resourceId, transaction)
                workOrderDetails = await models.WorkOrderDetail.scope(cancelledStatus ? '' : 'notDeleted').findOne({
                    where: { workOrderId },
                    include: [
                        {
                            model: models.CrematoryRetorts,
                            as: 'crematoryRetort'
                        }
                    ],
                    transaction
                })
            } else {
                let scheduledItemId = await models.sequelize.query(`select scs.itemUsageId from ScheduledCemeteryService scs
                inner join WorkOrder wo ON wo.resourceId = scs.id
                where wo.resourceType = 'ScheduledCemeteryService'
                and wo.id = ${workOrderId}`, { type: models.sequelize.QueryTypes.SELECT, transaction })

                schedulingDetails = await schedulingController.getScheduledCemeteryServiceDetails(personIdAndResourceId.personId, personIdAndResourceId.resourceId, transaction, !_.get(scheduledItemId, '[0].itemUsageId'))
                workOrderDetails = await models.WorkOrderDetail.scope(cancelledStatus ? '' : 'notDeleted').findOne({
                    where: { workOrderId },
                    include: [
                        {
                            model: models.CremationStatus,
                            as: 'cremationStatus'
                        },
                        {
                            model: models.Chapel,
                            as: 'cremationPlace'
                        },
                        {
                            model: models.CrematoryRetorts,
                            as: 'crematoryRetort'
                        }
                    ],
                    transaction
                })
                workOrderCasketInfo = await models.WorkOrderCasketInfo.findOne({ where: { workOrderId }, transaction })
            }

            // Get the service type and service name
            let serviceTypeAndServiceName = await WorkOrderController.getServiceNameAndServiceType(workOrderId, transaction)

            schedulingDetails = schedulingDetails.toJSON ? schedulingDetails.toJSON() : schedulingDetails

            if (serviceTypeAndServiceName) {
                schedulingDetails['serviceName'] = serviceTypeAndServiceName.serviceName
                schedulingDetails['serviceType'] = serviceTypeAndServiceName.serviceType
            }

            // Get details of the employees assigned to the  work order
            const employeesSchedule = await WorkOrderController.getEmployeeDetails(workOrderId, transaction, cancelledStatus)

            // Get hearse details for a work order
            const hearseDetails = await WorkOrderController.getVehicleDetails(workOrderId, 'hearse', transaction, cancelledStatus)

            // Get hearse details for a work order
            const utilityCarDetails = await WorkOrderController.getVehicleDetails(workOrderId, 'utilityCar', transaction, cancelledStatus)

            const notes = await models.Note.scope('withUpdatedBy', 'withCreatedBy').findAll({
                where: {
                    resourceType: 'WorkOrder',
                    resourceId: workOrder.id
                },
                transaction
            })

            // All the resource information
            const resourceInfo = {
                employeesSchedule,
                hearseDetails,
                utilityCarDetails,
                notes
            }

            // Get chamber log for a work order
            let chamberLog = await WorkOrderController.getChamberLog(workOrderId, cancelledStatus, transaction)

            // Get chamber log for a work order
            let decedentAndCremationDetails = await WorkOrderController.getDecedentAndCremationDetails(workOrderId, cancelledStatus, transaction)

            let response = {
                ...workOrder.toJSON(),
                schedulingDetails,
                resourceInfo,
                workOrderDetails,
                ...chamberLog,
                ...decedentAndCremationDetails
            }

            if (workOrder.resourceType === 'ScheduledCemeteryService') response = { ...response, workOrderCasketInfo }

            return response
        } catch (error) {
            throw error
        }
    }

    /**
     * This method fetches the service name and the service type for the received work order id
     * @param {number} workOrderId
     * @param {*} transaction
     */
    static async getServiceNameAndServiceType (workOrderId, transaction) {
        try {
            let serviceNameAndServieTypeQuery = `
                SELECT 
                WorkOrder.id, 
                AttributeValue.name AS serviceName,
                CASE
                    WHEN AgreementType.agreementType = 'Cemetry' THEN 'Cemetery'
                    ELSE AgreementType.agreementType
                END AS serviceType  
                FROM WorkOrder
                LEFT JOIN ScheduledFuneralService ON ScheduledFuneralService.id = WorkOrder.resourceId AND WorkOrder.resourceType = 'ScheduledFuneralService'
                LEFT JOIN ScheduledCemeteryService ON ScheduledCemeteryService.id = WorkOrder.resourceId AND WorkOrder.resourceType = 'ScheduledCemeteryService'
                LEFT JOIN ItemUsage ON ItemUsage.id IN (ScheduledCemeteryService.itemUsageId)
                LEFT JOIN AgreementLocationItem ON AgreementLocationItem.id IN (ScheduledFuneralService.agreementLocationItemId, ItemUsage.resourceId)
                LEFT JOIN AgreementPackageItem ON AgreementPackageItem.id IN (ScheduledFuneralService.agreementPackageItemId)
                LEFT JOIN AgreementCashAdvancedItem ON AgreementCashAdvancedItem.id IN (ScheduledFuneralService.agreementPackageItemId)
                LEFT JOIN AgreementPackage ON AgreementPackage.id = AgreementPackageItem.agreementPackageId
                INNER JOIN Agreement ON Agreement.id IN (AgreementLocationItem.agreementId, AgreementPackage.agreementId, AgreementCashAdvancedItem.agreementId)
                LEFT JOIN Addendum ON Addendum.id IN (AgreementLocationItem.addendumId, AgreementCashAdvancedItem.addendumId)
                INNER JOIN AgreementType ON AgreementType.id = Agreement.type
                INNER JOIN LocationItem ON LocationItem.id IN (AgreementLocationItem.locationItemId, AgreementPackageItem.locationItemId, AgreementCashAdvancedItem.locationItemId)
                INNER JOIN Item ON Item.id = LocationItem.itemId
                INNER JOIN ItemAttributeValue ON ItemAttributeValue.itemId = Item.id
                INNER JOIN AttributeValue ON AttributeValue.id = ItemAttributeValue.attributeValueId
                INNER JOIN Attribute ON Attribute.id = AttributeValue.attributeId
                WHERE WorkOrder.id =:workOrderId
                AND Attribute.name = 'Scheduling Service'
            `
            let serviceNameAndServieType = await models.sequelize.query(serviceNameAndServieTypeQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    workOrderId
                },
                transaction
            })

            return serviceNameAndServieType[0]
        } catch (error) {
            throw error
        }
    }

    /**
     * This function gets all the cemetery status
     * @param {*} name EX:with Crematory ,with Family
     */
    static async getCremationStatus (name, transaction) {
        try {
            let result
            if (name) {
                result = await models.CremationStatus.findAll({
                    where: {
                        name
                    },
                    transaction
                })
            } else {
                result = await models.CremationStatus.findAll({ transaction })
            }
            return result
        } catch (error) {
            throw error
        }
    }

    /**
     * @param {*} condition conditionvalue for hmis db
     * @param {*} updateValue updateValue
     */
    async temporaryPropertyUpdateInHMIS (condition, updateValue, userId, transaction) {
        try {
            const temporaryPropertyFromHMIS = await hmisDB.sequelize.query(`select * from Lot_Sell_Unit WHERE Lot_Sell_Unit_ID=:condition`, {
                type: hmisDB.sequelize.QueryTypes.SELECT,
                replacements: {
                    condition
                }
            })
            const user = await models.User.findOne({ where: { id: userId } })
            if (temporaryPropertyFromHMIS) {
                // fetching sequence number
                const sequence = await hmisDB.sequelize.query(`SELECT Next_ID from Sequence`, {
                    type: hmisDB.sequelize.QueryTypes.SELECT,
                    transaction
                })
                let incrementedSequenceId
                if (sequence) {
                    incrementedSequenceId = sequence[0].Next_ID + 1
                }
                // updating sequence number in hmis db by adding 1
                await hmisDB.sequelize.query(`update Sequence set Next_ID = ${incrementedSequenceId}`, { type: hmisDB.sequelize.QueryTypes.UPDATE, transaction })

                // preparing input data for inserting record into lot_sell_unit_history table of hmis
                let tableData = temporaryPropertyFromHMIS[0]
                tableData.Lot_Sell_Unit_History_ID = incrementedSequenceId
                tableData.Update_User_ID = user.ldapId ? user.ldapId : 'walfer'
                tableData.Last_Update_Dt = moment().format('YYYYMMDD HHMMSSSS')
                delete tableData.Map_Zoning
                let keys = Object.keys(tableData).join()
                let values = Object.values(tableData)

                // adding data into lot_sell_unit_history table
                await hmisDB.sequelize.query(`
                    INSERT INTO Lot_Sell_Unit_History(
                        ${keys}
                    ) output inserted.*
                    VALUES (
                        :values
                    )`, {
                    type: hmisDB.sequelize.QueryTypes.INSERT,
                    replacements: {
                        values: values
                    },
                    transaction
                })

                // updating wit TI and TB in lot_sell_unit table
                await hmisDB.sequelize.query(
                    `UPDATE Lot_Sell_Unit SET LSU_Status_Cd=:LSU_Status_Cd, Update_User_ID =:userLdapId,
                    Last_Update_Dt =:lastUpdatedDate WHERE Lot_Sell_Unit_ID=:Lot_Sell_Unit_ID`,
                    {
                        replacements: {
                            LSU_Status_Cd: updateValue,
                            userLdapId: user.ldapId ? user.ldapId : 'walfer',
                            lastUpdatedDate: moment().format('YYYYMMDD HHMMSSSS'),
                            Lot_Sell_Unit_ID: condition
                        },
                        transaction: transaction,
                        type: hmisDB.sequelize.QueryTypes.UPDATE
                    }
                )
                return true
            } else {
                return true
            }
        } catch (err) {
            throw err
        }
    }

    /**
     * This method returns count of all the workorders based on the status
     * @param {*} serviceCategory ['Funeral','Cemetry', 'Wholesale Cremation'] by default 'Funeral'
     */
    static async getWorkOrdersCount (serviceCategory = 'All') {
        try {
            let funeralAgreementType = await models.AgreementType.findOne({ where: { agreementType: 'Funeral' } })
            let cemeteryAgreementType = await models.AgreementType.findOne({ where: { agreementType: 'Cemetry' } })
            let wholesaleCremationAgreementType = await models.AgreementType.findOne({ where: { agreementType: 'Wholesale Cremation' } })
            let miscSalesAgreementType = await models.AgreementType.findOne({ where: { agreementType: 'Miscellaneous Sales' } })
            // let agreementType = await models.AgreementType.findOne({ where: { agreementType: serviceCategory } })
            // let scheduleServiceAttribute = await models.Attribute.findOne({ where: { name: 'Scheduling Service' } })
            // const scheduleServiceAttributeId = _.get(scheduleServiceAttribute, 'id')
            // let funeralQuery = this.getFuneralWorkOrderPrimaryQuery(scheduleServiceAttributeId)
            // let cemeteryQuery = this.getCemeteryWorkOrderPrimaryQuery(scheduleServiceAttributeId)

            // let primaryQuery = serviceCategory === 'Funeral' ? this.getFuneralWorkOrderPrimaryQuery(scheduleServiceAttributeId) : this.getCemeteryWorkOrderPrimaryQuery(scheduleServiceAttributeId)

            let totalCountQuery

            let agreementTypeFilter = ''

            if (serviceCategory === 'Cemetry') {
                agreementTypeFilter = `AND a.type IN (${cemeteryAgreementType.id})`
            } else if (serviceCategory === 'Wholesale Cremation') {
                agreementTypeFilter = `AND a.type IN (${wholesaleCremationAgreementType.id})`
            } else {
                agreementTypeFilter = `AND a.type IN (${cemeteryAgreementType.id},${wholesaleCremationAgreementType.id})`
            }

            let funeralAgreementTypeFilter = ''
            if (serviceCategory === 'Funeral') {
                funeralAgreementTypeFilter = `AND a.type IN (${funeralAgreementType.id})`
            } else if (serviceCategory === 'Miscellaneous Sales') {
                funeralAgreementTypeFilter = `AND a.type IN (${miscSalesAgreementType.id})`
            } else {
                funeralAgreementTypeFilter = `AND a.type IN (${miscSalesAgreementType.id},${funeralAgreementType.id})`
            }

            if (serviceCategory === 'All') {
                totalCountQuery = `
                                SELECT SUM(grouped.total) AS total, grouped.status FROM
                                (
                                SELECT COUNT(DISTINCT wo.id) AS total, wos.name as status from WorkOrder wo 
                                INNER JOIN WorkOrderStatus as wos ON wos.id = wo.statusId
                                WHERE resourceType='ScheduledFuneralService'  and wo.deletedAt is null
                                group by wos.name
                                UNION
                                SELECT COUNT(DISTINCT wo.id) AS total, wos.name as status from WorkOrder wo 
                                INNER JOIN WorkOrderStatus as wos ON wos.id = wo.statusId
                                LEFT JOIN WorkOrderDetail as wod on wod.workOrderId=wo.id
                                INNER JOIN ScheduledCemeteryService as sfs  ON sfs.id = wo.resourceId
                                INNER JOIN ItemUsage as iu on iu.id = sfs.itemUsageId
                                INNER JOIN AgreementLocationItem as ali ON ali.id = iu.resourceId and iu.resourceType='AgreementLocationItem'
                                INNER JOIN Agreement as a ON a.id = ali.agreementId
                                WHERE wo.resourceType='ScheduledCemeteryService' ${agreementTypeFilter} and wo.deletedAt is null
                                group by wos.name

                                ) AS grouped GROUP BY grouped.status`
            } else if (serviceCategory === 'Funeral' || serviceCategory === 'Miscellaneous Sales') {
                totalCountQuery = `SELECT COUNT(DISTINCT wo.id) AS total, wos.name as status from WorkOrder wo 
                INNER JOIN WorkOrderStatus as wos ON wos.id = wo.statusId
                INNER JOIN ScheduledFuneralService as sfs ON (sfs.id = wo.resourceId AND wo.resourceType = 'ScheduledFuneralService')
                LEFT JOIN AgreementLocationItem as ali ON ali.id = sfs.agreementLocationItemId
                LEFT JOIN AgreementPackageItem as api ON api.id = sfs.agreementPackageItemId
                LEFT JOIN AgreementCashAdvancedItem as acai ON acai.id = sfs.agreementCashAdvancedItemId
                LEFT JOIN AgreementPackage ap ON ap.id = api.agreementPackageId
                INNER JOIN Agreement as a ON a.id IN (ali.agreementId, ap.agreementId, acai.agreementId)
                WHERE resourceType='ScheduledFuneralService' ${funeralAgreementTypeFilter} and wo.deletedAt is null
                group by wos.name`
            } else {
                // Note: The same seachQuery goes for wholesale cremation
                totalCountQuery = `SELECT COUNT(DISTINCT wo.id) AS total, wos.name as status from WorkOrder wo 
                INNER JOIN WorkOrderStatus as wos ON wos.id = wo.statusId
                LEFT JOIN WorkOrderDetail as wod on wod.workOrderId=wo.id
                INNER JOIN ScheduledCemeteryService as sfs  ON sfs.id = wo.resourceId
                INNER JOIN ItemUsage as iu on iu.id = sfs.itemUsageId
                INNER JOIN AgreementLocationItem as ali ON ali.id = iu.resourceId and iu.resourceType='AgreementLocationItem'
                INNER JOIN Agreement as a ON a.id = ali.agreementId
                WHERE wo.resourceType='ScheduledCemeteryService' ${agreementTypeFilter} and wo.deletedAt is null
                group by wos.name`
            }

            // let totalCountQuery = `
            // SELECT COUNT(DISTINCT(wo.id)) as total, wos.name as status
            //         FROM ${primaryQuery}
            //         WHERE wo.resourceType=${serviceCategory === 'Funeral' ? `'ScheduledFuneralService'` : `'ScheduledCemeteryService'`} AND wo.deletedAt IS NULL AND wo.deletedBy IS NULL  AND agt.id= ${agreementType.id}
            //         GROUP BY wos.name
            //         `

            let deleteCountQuery

            if (serviceCategory === 'All') {
                deleteCountQuery = `
                SELECT SUM(grouped.total) AS total FROM
                (
                SELECT COUNT(DISTINCT wo.id) AS total from WorkOrder wo 
                WHERE resourceType='ScheduledFuneralService'  and wo.deletedAt is not null
                UNION
                SELECT COUNT(DISTINCT wo.id) AS total from WorkOrder wo 
                LEFT JOIN WorkOrderDetail as wod on wod.workOrderId=wo.id
                INNER JOIN ScheduledCemeteryService as sfs  ON sfs.id = wo.resourceId
                INNER JOIN ItemUsage as iu on iu.id = sfs.itemUsageId
                INNER JOIN AgreementLocationItem as ali ON ali.id = iu.resourceId and iu.resourceType='AgreementLocationItem'
                INNER JOIN Agreement as a ON a.id = ali.agreementId
                WHERE wo.resourceType='ScheduledCemeteryService' ${agreementTypeFilter} and wo.deletedAt is not null
                ) AS grouped 
                `
            } else if (serviceCategory === 'Funeral' || serviceCategory === 'Miscellaneous Sales') {
                deleteCountQuery = `SELECT COUNT(DISTINCT wo.id) AS total  from WorkOrder wo 
                INNER JOIN ScheduledFuneralService as sfs ON (sfs.id = wo.resourceId AND wo.resourceType = 'ScheduledFuneralService')
                LEFT JOIN AgreementLocationItem as ali ON ali.id = sfs.agreementLocationItemId
                LEFT JOIN AgreementPackageItem as api ON api.id = sfs.agreementPackageItemId
                LEFT JOIN AgreementCashAdvancedItem as acai ON acai.id = sfs.agreementCashAdvancedItemId
                LEFT JOIN AgreementPackage ap ON ap.id = api.agreementPackageId
                INNER JOIN Agreement as a ON a.id IN (ali.agreementId, ap.agreementId, acai.agreementId)
                WHERE resourceType='ScheduledFuneralService' ${funeralAgreementTypeFilter}  and wo.deletedAt is not  null`
            } else {
                // Note: The same seachQuery goes for wholesale cremation
                deleteCountQuery = `SELECT COUNT(DISTINCT wo.id) AS total, wos.name as status from WorkOrder wo 
                INNER JOIN WorkOrderStatus as wos ON wos.id = wo.statusId
                LEFT JOIN WorkOrderDetail as wod on wod.workOrderId=wo.id
                INNER JOIN ScheduledCemeteryService as sfs  ON sfs.id = wo.resourceId
                INNER JOIN ItemUsage as iu on iu.id = sfs.itemUsageId
                INNER JOIN AgreementLocationItem as ali ON ali.id = iu.resourceId and iu.resourceType='AgreementLocationItem'
                INNER JOIN Agreement as a ON a.id = ali.agreementId
                WHERE wo.resourceType='ScheduledCemeteryService' ${agreementTypeFilter} and wo.deletedAt is not null
                group by wos.name`
            }

            // let deleteCountQuery = ` SELECT COUNT(DISTINCT(wo.id)) as total, wos.name as status
            // FROM ${primaryQuery}
            // WHERE  wo.deletedAt IS NOT NULL AND wo.deletedBy IS NOT NULL AND wo.resourceType=${serviceCategory === 'Funeral' ? `'ScheduledFuneralService'` : `'ScheduledCemeteryService'`}
            // AND agt.id= ${agreementType.id} GROUP BY wos.name`

            const deletedCount = await models.sequelize.query(deleteCountQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })
            const totalCount = await models.sequelize.query(totalCountQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })
            const workOrderStatusCount = [...totalCount,
                {
                    total: deletedCount.length ? deletedCount[0].total : 0,
                    status: 'deleted'
                }
            ]
            return workOrderStatusCount
        } catch (error) {
            throw error
        }
    }
}

module.exports = WorkOrderController
