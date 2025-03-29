const _ = require('lodash')
const models = require('../../../models')
const moment = require('moment')
const Json2csvParser = require('json2csv').Parser
const logger = require('../../../lib/logger')
const { convertToJson } = require('../utils')

class WorkOrderExceptionReportsController {
    static getFuneralWorkOrderPrimaryQuery (scheduleServiceAttributeId) {
        let primaryQuery = `
        WorkOrder AS wo
            INNER JOIN WorkOrderStatus AS wos ON wos.id = wo.statusId
            LEFT JOIN WorkOrderDetail AS wod ON wod.workOrderId=wo.id
            INNER JOIN ScheduledFuneralService AS sfs ON (sfs.id = wo.resourceId AND wo.resourceType = 'ScheduledFuneralService')
            INNER JOIN Person AS p ON p.id = sfs.personId
            INNER JOIN PersonVerificationDetails AS pvd ON pvd.personId = p.id
            INNER JOIN SchedulingSection AS ss ON ss.id = sfs.schedulingSectionId
            LEFT JOIN AgreementLocationItem AS ali ON ali.id = sfs.agreementLocationItemId
            LEFT JOIN AgreementPackageItem AS api ON api.id = sfs.agreementPackageItemId
            LEFT JOIN AgreementCashAdvancedItem AS acai ON acai.id = sfs.agreementCashAdvancedItemId
            LEFT JOIN AgreementPackage ap ON ap.id = api.agreementPackageId
            INNER JOIN Agreement AS a ON a.id IN (ali.agreementId, ap.agreementId, acai.agreementId)
            LEFT JOIN Addendum AS ad ON ad.id IN (ali.addendumId, acai.addendumId)
            INNER JOIN AgreementType AS agt ON agt.id = a.type
            INNER JOIN LocationItem AS li ON li.id IN (ali.locationItemId, api.locationItemId, acai.locationItemId) 
            INNER JOIN Location AS location ON location.id = a.locationId
            LEFT JOIN Employee AS emp ON emp.id = a.arrangerId
            OUTER APPLY (SELECT TOP 1 createdAt
            FROM SomeOnePassed sop WHERE sop.decedentId = p.id ORDER BY sop.createdAt DESC ) SomeOne
            OUTER APPLY (SELECT TOP 1 createdAt
            FROM PreArrangement pa WHERE pa.beneficiaryId = p.id ORDER BY pa.createdAt DESC ) PreArr
        `
        if (scheduleServiceAttributeId) {
            primaryQuery = primaryQuery + (`INNER JOIN Attribute as at ON at.id = ${scheduleServiceAttributeId}`)
        }
        return primaryQuery
    }

    static getCemeteryWorkOrderPrimaryQuery () {
        return `
        WorkOrder AS wo
            INNER JOIN WorkOrderStatus AS wos ON wos.id = wo.statusId
            LEFT JOIN WorkOrderDetail AS wod ON wod.workOrderId=wo.id
            INNER JOIN ScheduledCemeteryService AS sfs  ON sfs.id = wo.resourceId
            INNER JOIN Person AS p ON p.id = sfs.personId
            INNER JOIN PersonVerificationDetails AS pvd ON pvd.personId = p.id
            INNER JOIN ItemUsage AS iu ON iu.id = sfs.itemUsageId
            INNER JOIN AgreementLocationItem AS ali ON ali.id = iu.resourceId and iu.resourceType='AgreementLocationItem'
            INNER JOIN Agreement AS a ON a.id = ali.agreementId
            INNER JOIN Location AS location ON location.id = a.locationId
            INNER JOIN AgreementType AS agt ON agt.id = a.type
            LEFT JOIN Addendum AS ad ON ad.id = ali.addendumId
            LEFT JOIN IntermentInformationSection iis ON sfs.intermentInformationSectionId=iis.id
            LEFT JOIN DisintermentInfoSection dis ON sfs.disintermentInfoSectionId=dis.id
            LEFT JOIN Employee AS emp ON emp.id = a.arrangerId
            OUTER APPLY (SELECT TOP 1 createdAt
            FROM SomeOnePassed sop WHERE sop.decedentId = p.id ORDER BY sop.createdAt DESC ) SomeOne
            OUTER APPLY (SELECT TOP 1 createdAt
            FROM PreArrangement pa WHERE pa.beneficiaryId = p.id ORDER BY pa.createdAt DESC ) PreArr
            `
    }

    static async _queryObjForWOExceptionReports (filters) {
        let sql = ''
        Object.keys(filters).map((e) => {
            switch (e) {
            case 'contractNumber':
                sql += ` AND (LTRIM(RTRIM(a.contractNumber)) LIKE '%${filters.contractNumber}%' OR REPLACE(LTRIM(RTRIM(ad.addendumNumber)), '  ', '') LIKE '%${filters.contractNumber}%')`
                break
            case 'workOrderId':
                sql += ` AND wo.onePortalWorkOrderId LIKE '%${filters.workOrderId}%'`
                break
            case 'agreementType':
                sql += ` AND agt.agreementType LIKE '${filters.agreementType}'`
                break
            case 'workOrderStatus':
                sql += ` AND wos.name LIKE '${filters.workOrderStatus}'`
                break
            case 'locationId':
                sql += ` AND location.id = ${filters.locationId}`
                break
            case 'arrangerId':
                sql += ` AND emp.id = ${filters.arrangerId}`
                break
            case 'caseStartDate':
                let startDate = moment(filters.caseStartDate).tz(filters.timezone).startOf('day').format('YYYY/MM/DD HH:mm:ss')
                let endDate = moment(filters.caseEndDate).tz(filters.timezone).endOf('day').format('YYYY/MM/DD HH:mm:ss')
                sql += ` AND pvd.verifiedAt BETWEEN '${startDate}' AND '${endDate}'`
                break
            case 'callStartDate':
                let callStartDate = moment(filters.callStartDate).tz(filters.timezone).startOf('day').format('YYYY/MM/DD HH:mm:ss')
                let callEndDate = moment(filters.callEndDate).tz(filters.timezone).endOf('day').format('YYYY/MM/DD HH:mm:ss')
                sql += ` AND COALESCE(SomeOne.createdAt, PreArr.createdAt) BETWEEN '${callStartDate}' AND '${callEndDate}'`
                break
            case 'workOrderCreatedAtStartDate':
                let woCreatedStartDate = moment(filters.workOrderCreatedAtStartDate).tz(filters.timezone).startOf('day').format('YYYY/MM/DD HH:mm:ss')
                let woCreatedEndDate = moment(filters.workOrderCreatedAtEndDate).tz(filters.timezone).endOf('day').format('YYYY/MM/DD HH:mm:ss')
                sql += ` AND wo.createdAt BETWEEN '${woCreatedStartDate}' AND '${woCreatedEndDate}'`
                break
            default:
                break
            }
        })

        if (filters.workOrderFor) {
            let words = '\'' + filters.workOrderFor.split(' ').join('\',\'') + '\''
            sql += ` AND ( (p.firstName LIKE '%${filters.workOrderFor}%' OR p.middleName LIKE '%${filters.workOrderFor}%' OR p.lastName LIKE '%${filters.workOrderFor}%' OR p.firstName IN (${words}) OR p.middleName IN (${words}) OR p.lastName IN (${words})) 
                 OR 
                (p.firstName LIKE '%${filters.workOrderFor}%' OR p.middleName LIKE '%${filters.workOrderFor}%' OR p.lastName LIKE '%${filters.workOrderFor}%' OR p.firstName IN (${words}) OR p.middleName IN (${words}) OR p.lastName IN (${words})) ) `
        }
        sql += ` AND wos.name NOT IN ('closed') `
        sql += ` AND wo.deletedAt IS NULL `

        return sql
    }

    static async getWOExceptionReportLists (filters = {}) {
        try {
            let { page = 1, limit = 10, getAllRecords = false } = filters
            if (getAllRecords) {
                let totalCount = await models.sequelize.query('SELECT COUNT(*) AS woCount FROM WorkOrder', {
                    type: models.sequelize.QueryTypes.SELECT
                })
                limit = totalCount[0].woCount
            }
            page = (page - 1) * limit

            let count
            let listQuery = await this._queryObjForWOExceptionReports(filters)

            let cemeteryAgreementType = await models.AgreementType.findOne({ where: { agreementType: 'Cemetry' } })
            let funeralAgreementType = await models.AgreementType.findOne({ where: { agreementType: 'Funeral' } })
            let wholeSaleCremationAgreementType = await models.AgreementType.findOne({ where: { agreementType: 'Wholesale Cremation' } })
            let scheduleServiceAttribute = await models.Attribute.findOne({ where: { name: 'Scheduling Service' } })
            const scheduleServiceAttributeId = _.get(scheduleServiceAttribute, 'id')

            let funeralQuery = this.getFuneralWorkOrderPrimaryQuery(scheduleServiceAttributeId)
            let cemeteryQuery = this.getCemeteryWorkOrderPrimaryQuery(scheduleServiceAttributeId)

            let funeralColumns = `wo.id,
            wo.createdAt AS workOrderCreatedAt,
            wo.onePortalWorkOrderId AS workOrderId,
            wos.name AS workOrderStatus,
            p.id AS personId,
            location.id AS locationId,
            emp.id AS empId,
            REPLACE(LTRIM(RTRIM(a.contractNumber)), '  ', '') AS contractNumber,
            REPLACE(LTRIM(RTRIM(ad.addendumNumber)), '  ', '') AS addendumNumber,
            a.id AS agreementId,
            ad.id AS addendumId,
            ss.beginningTime,
            agt.agreementType,
            location.name AS locationName,
            emp.name AS arrangerName,
            RTRIM(LTRIM(
                CONCAT(
                    COALESCE(p.firstName + ' ', '')
                    , COALESCE(p.middleName + ' ', '')
                    , COALESCE(p.lastName, '')
                )
            )) AS workOrderFor,
            COALESCE(SomeOne.createdAt, PreArr.createdAt) AS callDate,
            pvd.verifiedAt AS caseDate,
            DATEDIFF(DAY, GETDATE() , ss.beginningTime) AS daysUntilService`

            let cemeteryColumns = `wo.id,
            wo.createdAt AS workOrderCreatedAt,
            wo.onePortalWorkOrderId AS workOrderId,
            wos.name AS workOrderStatus,
            p.id AS personId,
            location.id AS locationId,
            emp.id AS empId,
            REPLACE(LTRIM(RTRIM(a.contractNumber)), '  ', '') AS contractNumber,
            REPLACE(LTRIM(RTRIM(ad.addendumNumber)), '  ', '') AS addendumNumber,
            a.id AS agreementId,
            ad.id AS addendumId,
            CASE WHEN iis.beginningTime IS NULL THEN dis.beginningTime ELSE iis.beginningTime END AS beginningTime,
            agt.agreementType,
            location.name AS locationName,
            emp.name AS arrangerName,
            RTRIM(LTRIM(
                CONCAT(
                    COALESCE(p.firstName + ' ', '')
                    , COALESCE(p.middleName + ' ', '')
                    , COALESCE(p.lastName, '')
                )
            )) AS workOrderFor,
            COALESCE(SomeOne.createdAt, PreArr.createdAt) AS callDate,
            pvd.verifiedAt AS caseDate,
            CASE WHEN iis.beginningTime IS NULL THEN DATEDIFF(DAY, GETDATE() , dis.beginningTime) ELSE DATEDIFF(DAY, GETDATE() , iis.beginningTime) END AS daysUntilService`

            let agreementTypeFilterForFun = `AND agt.id = ${funeralAgreementType.id}`

            let agreementTypeFilterForCemAndWhole = `AND agt.id IN (${cemeteryAgreementType.id},${wholeSaleCremationAgreementType.id})`

            let countQuery = `
            SELECT SUM(grouped.total) AS total FROM
            (SELECT COUNT (funeralWorkOrders.id) AS total FROM (SELECT DISTINCT ${funeralColumns} FROM ${funeralQuery}
                WHERE 
                wo.resourceType = 'ScheduledFuneralService'
                ${agreementTypeFilterForFun}
                ${listQuery}) AS funeralWorkOrders
            UNION ALL
            SELECT COUNT (cemeteryWorkdOrders.id) AS total FROM (SELECT DISTINCT ${cemeteryColumns} FROM ${cemeteryQuery}
                WHERE 
                wo.resourceType = 'ScheduledCemeteryService'
                ${agreementTypeFilterForCemAndWhole}
                ${listQuery}) AS cemeteryWorkdOrders) AS grouped`

            let primaryQuery = `SELECT * FROM ((SELECT DISTINCT    
                ${funeralColumns}
                FROM 
                ${funeralQuery}
                WHERE 
                wo.resourceType = 'ScheduledFuneralService'
                ${agreementTypeFilterForFun}
                ${listQuery}
                ) UNION (
                SELECT  DISTINCT  
                ${cemeteryColumns}
                FROM
                ${cemeteryQuery}
                WHERE 
                wo.resourceType = 'ScheduledCemeteryService'
                ${agreementTypeFilterForCemAndWhole}
                ${listQuery}
                )) list ORDER BY list.beginningTime ASC  
                OFFSET ${page} ROWS FETCH NEXT ${limit} ROWS ONLY`

            count = await models.sequelize.query(countQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })

            const reportList = await models.sequelize.query(primaryQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })

            return {
                items: reportList,
                total: count[0].total
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    static async exportOpenWorkOrders (req, res, next) {
        try {
            req.query.getAllRecords = true
            const openWO = await this.getWOExceptionReportLists(req.query)
            if (_.get(openWO, 'items.length')) {
                let exportRes = openWO.items.map((e, key) => {
                    return {
                        'Statement Number': e.addendumNumber || e.contractNumber,
                        'Call Date': e.callDate ? moment(e.callDate).tz(req.query.timezone).format('MM/DD/YYYY') : '',
                        'Case Date': e.caseDate ? moment(e.caseDate).tz(req.query.timezone).format('MM/DD/YYYY') : '',
                        'Agreement Type': e.agreementType === 'Cemetry' ? 'Cemetery' : e.agreementType,
                        'Location': e.locationName,
                        'Arranger': e.arrangerName,
                        'Work Order #': e.workOrderId,
                        'Work Order Status': _.capitalize(e.workOrderStatus),
                        'Work Order Creation Date': e.workOrderCreatedAt ? moment(e.workOrderCreatedAt).tz(req.query.timezone).format('MM/DD/YYYY') : '',
                        'Work Order For': e.workOrderFor,
                        'Days until service': e.daysUntilService
                    }
                })
                const json2csvParser = new Json2csvParser({ excelStrings: true })
                const csv = json2csvParser.parse(exportRes)
                res.attachment('openWorkOrders.csv')
                res.send(Buffer.from(csv))
            } else {
                res.json({
                    success: true,
                    msg: 'No records found'
                })
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
    static async getDuplicateWorkOrderReport (queryObj, exp) {
        let sql = `duplicate.details IS NOT NULL `
        Object.keys(queryObj).map((e) => {
            switch (e) {
            case 'caseIds':
                sql += ` AND [p].[id] IN (select value from STRING_SPLIT('${queryObj.caseIds.join(',')}', ','))`
                break
            case 'contractNumber':
                sql += `AND [p].[contractNumber] LIKE '%${queryObj.contractNumber}%'`
                break
            case 'opi':
                sql += ` AND [p].[decedentOnePortalId] LIKE '%${queryObj.opi}%'`
                break
            case 'workOrderId':
                sql += ` AND [p].[workOrderId] LIKE '%${queryObj.workOrderId.trim()}%'`
                break
            case 'arrangerId':
                sql += ` AND [p].[arrangerId] = ${queryObj.arrangerId}`
                break
            // case 'duplicateWorkOrderId':
            //     sql += ` AND duplicate.details.workOrderId = '${queryObj.duplicateWorkOrderId}''`
            //     break
            default:
                break
            }
        })
        const offset = (queryObj.page - 1) * queryObj.limit
        const sortOrder = queryObj.sortOrder || 'desc'
        const orderByQuery = `ORDER BY [p].[updatedAt] ${sortOrder}`
        let query = `DECLARE @DuplicateWorkOrderTemp TABLE(
            id int,
            contractNumber VARCHAR(200),
            decedentOnePortalId  VARCHAR(200),
            agreementId int,
            type int,
            decedentId int,
            arrangerId int,
            arranger VARCHAR(200),
            workOrderId VARCHAR(200),
            createdOn Date,
            itemAttribute VARCHAR(200),
            updatedAt Date
        );
        Insert @DuplicateWorkOrderTemp
        select  distinct wo.id as id, agreement.contractNumber as contractNumber,pvd.onePortalId as decedentOnePortalId, agreement.id as agreementId, agreement.type as type, pvd.personId as decedentId, arr.id as arrangerId, arr.name as arranger,
        wo.onePortalWorkOrderId as workOrderId, wo.createdAt as createdOn, av.name as itemAttribute, wo.updatedAt as updatedAt
        FROM WorkOrder AS wo
            LEFT JOIN ScheduledFuneralService as sfs ON (sfs.id = wo.resourceId AND wo.resourceType = 'ScheduledFuneralService')
            LEFT JOIN ScheduledCemeteryService as scs ON (scs.id = wo.resourceId AND wo.resourceType = 'ScheduledCemeteryService')
            LEFT JOIN Person as person ON person.id IN ( scs.personId, sfs.personId)
            LEFT JOIN PersonVerificationDetails pvd ON pvd.personId = person.id
            LEFT JOIN SchedulingSection as ss ON ss.id = sfs.schedulingSectionId
            LEFT JOIN IntermentInformationSection iis on scs.intermentInformationSectionId=iis.id
            LEFT JOIN DisintermentInfoSection dis on scs.disintermentInfoSectionId= dis.id
            LEFT JOIN ItemUsage as iu ON iu.id IN (scs.itemUsageId) AND iu.deletedAt IS NULL
            LEFT JOIN AgreementLocationItem as ali ON ali.id IN (sfs.agreementLocationItemId, iu.resourceId) AND ali.deletedAt IS NULL
            LEFT JOIN AgreementCashAdvancedItem as acai ON acai.id = sfs.agreementCashAdvancedItemId AND acai.deletedAt IS NULL
            LEFT JOIN LocationItem as li ON li.id IN (acai.locationItemId, ali.locationItemId)
            LEFT JOIN Item as item ON item.id = li.itemId
            LEFT JOIN ItemAttributeValue iav ON iav.itemId = item.id
            LEFT JOIN AttributeValue av ON av.id = iav.attributeValueId
            INNER JOIN SchedulingAttributeSection sas ON sas.attributeValueId = av.id
            INNER JOIN Agreement as agreement ON agreement.id IN (ali.agreementId, acai.agreementId)
            INNER JOIN Employee as arr ON arr.id = agreement.arrangerId ORDER BY wo.updatedAt desc


        SELECT p.id as id, p.decedentOnePortalId as decedentOnePortalId, p.decedentId as decedentId, p.createdOn as createdOn, p.workOrderId as workOrderId, p.itemAttribute as itemAttributeId,
        ( select p.arrangerId as id, p.arranger as name FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) as arranger,
        ( select p.agreementId as id , p.contractNumber, p.type as type FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) as contract,
         duplicate.details AS duplicateWorkOrders from
        @DuplicateWorkOrderTemp p
        OUTER APPLY (
            SELECT (
                SELECT pp.id as id , pp.workOrderId as workOrderId, pp.createdOn as createdOn, pp.itemAttribute, pp.decedentOnePortalId, pp.decedentId
                from @DuplicateWorkOrderTemp pp
                WHERE p.workOrderId != pp.workOrderId AND p.decedentOnePortalId = pp.decedentOnePortalId AND  pp.itemAttribute = p.itemAttribute
                 FOR JSON PATH
            ) AS details 
        ) as duplicate WHERE ${sql} ${orderByQuery}`
        if (queryObj.page) {
            query += ` OFFSET ${offset} ROWS FETCH NEXT ${queryObj.limit} ROWS ONLY
                        DELETE FROM @DuplicateWorkOrderTemp`
        }
        const list = await models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT })
        list.map(e => convertToJson(e))
        return list
    }
}

module.exports = WorkOrderExceptionReportsController
