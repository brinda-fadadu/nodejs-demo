const logger = require('../../../lib/logger')
const models = require('../../../models')
const Op = require('sequelize').Op
const { getKey } = require('../../../lib/util')
const { seed } = require('../../../config/seed')
const _ = require('lodash')
const { upsert, commonDownloadFileWithSignature } = require('../utils')
const SchedulingSectionController = require('./schedulingSectionController')
const CemeteryInfoSectionController = require('./cemeteryInfoSectionController')
const ResourceSectionController = require('./resourceSectionController')
const CasketSectionController = require('./casketSectionController')
const UrnInfoSectionController = require('./urnInfoSectionController')
const UrnTransferController = require('./urnTransferController')
const SubServicesSectionController = require('./subServicesSectionController')
const WorkOrderController = require('../workOrderController/workOrderController')
const ItemUsageController = require('../itemUsageController/itemUsageController')
const PersonController = require('../personController/personController')
const IntermentInfoSectionController = require('./intermentInfoSectionController')
const IntermentRequestSectionController = require('./intermentRequestSectionController')
const DisintermentInfoSectionController = require('./disintermentInfoSectionController')
const VaultSectionController = require('./vaultSectionController')
const MerchandiseInfoSectionController = require('./merchandiseInfoSectionController')
const GenericSectionController = require('./genericSectionController')
const FuneralArrangementSectionController = require('./funeralArrangementSectionController')
const SchedulingFileController = require('./schedulingFileController')
const hmisDB = require('../../../services/hmis/hmisConnection')
const { returnFullName } = require('../../../utils/formatters')
const { convertToJson } = require('../utils')
// const CremationSyncController = require('../familyPortalController/cremationSyncController')
const faaWorker = require('../../../workers/faa_worker/CallFaaWorker')
const moment = require('moment')

const { _createNoteForResourceSection, _getNoteSections, getCommonQueryFuneralArragement, getSSArray, getSSItems, getCasketDetailsSection, getUrnDetailsSection, getCommonQueryMerchandise, getMerchandiseItems } = require('./schedulingCommonInclude')
class SchedulingController {
    static get TYPES () {
        return {
            1: 'Funeral',
            2: 'Cemetery',
            3: 'Miscellaneous Sales',
            4: 'Wholesale Cremation',
            5: 'Miscellaneous Sales'

        }
    }

    /**
     * Fetch list of fields for selected service.
     * @param {*} agPackageItemId agreementPackageItemId
     * @param {*} agLocationItemId agreementLocationItemId
     */
    // Fetching the sections and subsections data. refer user story: CCS-6404
    static async getFieldsForSchedulingService (agPackageItemId, agLocationItemId, agCaiId, itemUsageId, type) {
        try {
            let agmtType = type || (itemUsageId ? 'Cemetery' : 'Funeral')
            let commonInclude = [
                {
                    model: models.LocationItem,
                    as: 'locationItem',
                    attributes: ['id'],
                    required: true,
                    include: [{
                        model: models.Item,
                        attributes: ['id'],
                        required: true,
                        include: [{
                            model: models.ItemAttributeValue,
                            as: 'itemAttributes',
                            attributes: ['id'],
                            required: true,
                            include: [{
                                model: models.AttributeValue,
                                attributes: ['name'],
                                required: true,
                                include: [{
                                    model: models.SchedulingAttributeSection,
                                    as: 'schedulingSections',
                                    where: {
                                        type: agmtType
                                    },
                                    attributes: ['section'],
                                    required: true,
                                    include: [{
                                        model: models.SchedulingAttributeSubSection,
                                        as: 'fields',
                                        attributes: ['subSection', 'subSectionLabel']
                                    }]
                                }]
                            }]
                        }]
                    }]
                }
            ]
            if (agPackageItemId || agLocationItemId || agCaiId) {
                // table name is dynamically adding based on query params and at a time only one query parameter will come.
                // In the below query, every model data is required.
                const tableName = agPackageItemId ? 'AgreementPackageItem' : (agLocationItemId ? 'AgreementLocationItem' : 'AgreementCashAdvancedItem')
                const result = await models[tableName].findOne({
                    where: { id: agPackageItemId || agLocationItemId || agCaiId },
                    attributes: ['id'],
                    required: true,
                    include: commonInclude
                })
                if (result) {
                    // Getting first element from itemAttributes array,
                    // locationItem and Item will definitely come because added required: true in the query.
                    const [firstValueFromItemAttribute] = result.locationItem.Item.itemAttributes
                    const finalResult = firstValueFromItemAttribute.AttributeValue.schedulingSections
                    return finalResult
                } else {
                    throw new Error('AgreementPackageItemId / AgreementLocationItemId / AgreementCashAdvanceItemId OR scheduling sections not found for given item')
                }
            } else if (itemUsageId) {
                const result = await models.ItemUsage.findOne({
                    where: {
                        id: itemUsageId
                    },
                    include: [
                        {
                            model: models.AgreementLocationItem,
                            as: 'agreementItems',
                            attributes: ['id'],
                            required: true,
                            include: commonInclude
                        }
                    ]
                })
                if (result) {
                    const [firstValueFromItemAttribute] = result.agreementItems.locationItem.Item.itemAttributes
                    const finalResult = firstValueFromItemAttribute.AttributeValue.schedulingSections
                    return finalResult
                } else {
                    throw new Error('Scheduling Sections not found for given item')
                }
            } else {
                throw new Error('AgreementPackageItemId Or AgreementLocationItemId Or AgreementCashAdvanceItemId Or ItemUsageId is required')
            }
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    static getCommonQuery (type, personId, agreementType, arrangementType) {
        let agreementInclude = []
        if (type === 'funeral' || type === 'miscellaneousSalesFuneral') {
            agreementInclude = [
                {
                    model: models.AgreementLocationItem,
                    as: 'agreementItems',
                    where: { deletedAt: null },
                    required: false,
                    include: [
                        {
                            model: models.Addendum,
                            as: 'addendumDetails'
                        },
                        {
                            model: models.AgreementItemPrice,
                            as: 'agreementItemPrice',
                            required: true
                        },
                        {
                            model: models.LocationItem.scope(type === 'funeral' ? 'withSchedulingService' : { method: ['withSchedulingServiceMiscSales', 'Funeral'] }),
                            as: 'locationItem',
                            attributes: ['id', 'itemId'],
                            required: true
                        }
                    ]
                },
                {
                    model: models.AgreementPackage,
                    as: 'agreementPackages',
                    where: { deletedAt: null },
                    required: false,
                    attribute: ['id'],
                    include: [
                        {
                            model: models.Addendum,
                            as: 'addendumDetails'
                        },
                        {
                            model: models.AgreementItemPrice,
                            as: 'agreementItemPrice',
                            required: true
                        },
                        {
                            model: models.AgreementPackageItem,
                            as: 'packageItems',
                            required: true,
                            include: [
                                {
                                    model: models.LocationItem.scope('withSchedulingService'),
                                    as: 'locationItem',
                                    attributes: ['id', 'itemId'],
                                    required: true
                                }
                            ]
                        }
                    ]
                },
                {
                    model: models.AgreementCashAdvancedItem,
                    as: 'agreementCashAdvanceItems',
                    where: { deletedAt: null },
                    required: false,
                    include: [
                        {
                            model: models.Addendum,
                            as: 'addendumDetails'
                        },
                        {
                            model: models.AgreementItemPrice,
                            as: 'agreementItemPrice',
                            required: true
                        },
                        {
                            model: models.LocationItem.scope(type === 'funeral' ? 'withSchedulingService' : { method: ['withSchedulingServiceMiscSales', 'Funeral'] }),
                            as: 'locationItem',
                            attributes: ['id', 'itemId'],
                            required: true
                        }
                    ]
                }
            ]
        }
        let agreementRole = ['Beneficiary', 'Purchaser']
        if (['cemetery', 'funeral'].includes(type)) {
            agreementInclude.push({
                model: models.SaleType,
                as: 'saleType',
                where: {
                    agreementType: { [Op.in]: agreementType },
                    arrangementType: arrangementType,
                    isActive: true
                }
            })
            agreementRole = ['Beneficiary']
        }
        if (type === 'miscellaneousSalesCemetery') {
            agreementRole = ['Beneficiary']
        }
        if (type === 'cemetery') {
            agreementInclude = [
                {
                    model: models.AgreementLocationItem,
                    as: 'agreementItems',
                    where: { deletedAt: null },
                    required: false,
                    include: [
                        {
                            model: models.Addendum,
                            as: 'addendumDetails'
                        },
                        {
                            model: models.ItemUsage,
                            as: 'itemsUsage',
                            where: {
                                personId: personId,
                                resourceType: 'AgreementLocationItem',
                                deletedAt: null,
                                deletedBy: null
                            },
                            attributes: ['id', 'usageStatus'],
                            include: [
                                {
                                    model: models.ScheduledCemeteryService.scope('workOrderStatusScope'),
                                    as: 'scheduledCemeteryService',
                                    required: false,
                                    where: {
                                        personId: personId,
                                        deletedAt: null,
                                        deletedBy: null
                                    },
                                    include: [
                                        {
                                            model: models.IntermentInformationSection,
                                            as: 'intermentInformationDetails',
                                            attributes: ['beginningTime', 'endingTime']
                                        }, {
                                            model: models.DisintermentInfoSection,
                                            as: 'disintermentInformationDetails',
                                            attributes: ['beginningTime', 'endingTime']
                                        }
                                    ]
                                }
                            ],
                            required: true
                        },
                        {
                            model: models.AgreementItemPrice,
                            as: 'agreementItemPrice',
                            required: true
                        },
                        {
                            model: models.LocationItem.scope(type === 'cemetery' ? 'withSchedulingService' : { method: ['withSchedulingServiceMiscSales', 'Cemetery'] }),
                            as: 'locationItem',
                            attributes: ['id', 'itemId'],
                            required: true
                        }
                    ]
                }
            ]
        }

        if (type === 'miscellaneousSalesCemetery') {
            agreementInclude = [
                {
                    model: models.AgreementLocationItem,
                    as: 'agreementItems',
                    where: { deletedAt: null },
                    required: false,
                    include: [
                        {
                            model: models.Addendum,
                            as: 'addendumDetails'
                        },
                        /* {
                            model: models.ScheduledCemeteryService.scope('workOrderStatusScope'),
                            as: 'scheduledCemeteryService',
                            required: false,
                            where: {
                                personId: personId,
                                deletedAt: null,
                                deletedBy: null
                            },
                            include: [
                                {
                                    model: models.IntermentInformationSection,
                                    as: 'intermentInformationDetails',
                                    attributes: ['beginningTime', 'endingTime']
                                }, {
                                    model: models.DisintermentInfoSection,
                                    as: 'disintermentInformationDetails',
                                    attributes: ['beginningTime', 'endingTime']
                                }
                            ]
                        }, */
                        {
                            model: models.AgreementItemPrice,
                            as: 'agreementItemPrice',
                            required: true
                        },
                        {
                            model: models.LocationItem.scope(type === 'cemetery' ? 'withSchedulingService' : { method: ['withSchedulingServiceMiscSales', 'Cemetery'] }),
                            as: 'locationItem',
                            attributes: ['id', 'itemId'],
                            required: true
                        }
                    ]
                }
            ]
        }

        let whereCond = { id: personId, isAlive: false }
        if (['miscellaneousSalesFuneral', 'miscellaneousSalesCemetery'].includes(type)) {
            whereCond = { id: personId }
        }
        let commonQuery = {
            where: whereCond,
            attributes: [],
            include: [
                {
                    model: models.AgreementPerson,
                    as: 'agreementPersons',
                    where: {
                        personId: personId
                    },
                    attributes: ['id', 'agreementId', 'roleId'],
                    include: [
                        {
                            model: models.AgreementRole,
                            as: 'agreementRole',
                            where: {
                                name: { [Op.in]: agreementRole }
                            },
                            required: true
                        },
                        {
                            model: models.Agreement,
                            where: {
                                type: { [Op.in]: agreementType },
                                contractNumber: {
                                    [Op.ne]: null
                                }
                            },
                            attributes: ['id', 'saleTypeId', 'contractNumber', 'type', 'due'],
                            include: agreementInclude
                        }
                    ]
                }
            ]
        }
        if (type !== 'cemetery' && type === 'miscellaneousSalesCemetery') {
            commonQuery.include.push({
                model: models.ScheduledCemeteryService.scope('workOrderStatusScope'),
                as: 'scheduledCemeteryServices',
                required: false,
                where: {
                    personId: personId,
                    deletedAt: null,
                    deletedBy: null
                },
                include: [
                    {
                        model: models.IntermentInformationSection,
                        as: 'intermentInformationDetails',
                        attributes: ['beginningTime', 'endingTime']
                    }, {
                        model: models.DisintermentInfoSection,
                        as: 'disintermentInformationDetails',
                        attributes: ['beginningTime', 'endingTime']
                    }
                ]
            })
        } else if (type !== 'cemetery' && type !== 'miscellaneousSalesCemetery') {
            commonQuery.include.push({
                model: models.ScheduledFuneralService.scope(['workOrderScopeGetscheduleList', 'schedulingSectionScope']),
                as: 'scheduledFuneralServices',
                required: false,
                where: {
                    personId: personId,
                    deletedAt: null,
                    deletedBy: null
                }
            })
        }
        return commonQuery
    }

    /**
     * Fetches the list of Schedulable Services of a Person
     * user story CCS-6324
     * @param {*} personId is the id of a Person
     */
    static async getSchedulableServices (personId) {
        try {
            const AgmtCtrl = require('../agreementController/agreementController')
            let agreementType = AgmtCtrl.TYPES.Funeral
            let cemeteryAgreementType = AgmtCtrl.TYPES.Cemetry
            let wscAgreementType = AgmtCtrl.TYPES['Wholesale Cremation']
            let mscAgreementType = AgmtCtrl.TYPES['Miscellaneous Sales']
            let arrangementType = Number(getKey(seed.ArrangementType, 'AN'))
            let ssQuery = this.getCommonQuery('funeral', personId, [agreementType], arrangementType)
            let cssQuery = this.getCommonQuery('cemetery', personId, [cemeteryAgreementType, wscAgreementType], null)
            let msFuneralQuery = this.getCommonQuery('miscellaneousSalesFuneral', personId, [mscAgreementType])
            let msCemeteryQuery = this.getCommonQuery('miscellaneousSalesCemetery', personId, [mscAgreementType])
            let schedulableServices = await models.Person.findOne(ssQuery)
            const cemeterySchedulableServices = await models.Person.findOne(cssQuery)
            const msSchedulableFuneralServices = await models.Person.findOne(msFuneralQuery)
            let msSchedulableCemeteryServices = await models.Person.findOne(msCemeteryQuery)
            if (msSchedulableCemeteryServices) {
                msSchedulableCemeteryServices = msSchedulableCemeteryServices.toJSON()
            }

            let newMsSchedulableServices = []
            if (msSchedulableFuneralServices && msSchedulableFuneralServices.agreementPersons) {
                await Promise.all(msSchedulableFuneralServices.agreementPersons.map(async (agrmntPerson) => {
                    let agrmtId = agrmntPerson.Agreement.id
                    let query = `
                Select * from Agreement a
                INNER JOIN AgreementPerson ap on a.id = ap.agreementId
                INNER JOIN AgreementLocationItem agrmtlocitem on agrmtlocitem.agreementId = a.id
                INNER JOIN ScheduledFuneralService sfs on sfs.personId = ap.personId AND sfs.agreementLocationItemId = agrmtlocitem.id
                WHERE a.id = ${agrmtId} AND ap.roleId = 1 AND agrmtlocitem.deletedAt IS NULL AND agrmtlocitem.deletedBy IS  NULL`
                    let purchaserScheduledList = await models.sequelize.query(query, {
                        type: models.sequelize.QueryTypes.SELECT
                    })
                    if (agrmntPerson.agreementRole && agrmntPerson.agreementRole.name === 'Purchaser') {
                        let decedent = await models.AgreementPerson.findOne({
                            where: {
                                agreementId: agrmtId,
                                roleId: 3
                            }
                        })
                        if (!decedent) {
                            newMsSchedulableServices.push(agrmntPerson)
                        } else {
                            agrmntPerson.Agreement.agreementItems = agrmntPerson.Agreement.agreementItems.filter((ele) => {
                                let arraylist = purchaserScheduledList.filter((ele1) => {
                                    if (ele1.agreementLocationItemId === ele.id) {
                                        return true
                                    }
                                })
                                return !!(arraylist && arraylist.length)
                            })
                            if (agrmntPerson.Agreement.agreementItems.length) {
                                newMsSchedulableServices.push(agrmntPerson)
                            }
                        }
                    }
                    if (agrmntPerson.agreementRole && agrmntPerson.agreementRole.name === 'Beneficiary') {
                        if (purchaserScheduledList.length) {
                            agrmntPerson.Agreement.agreementItems = agrmntPerson.Agreement.agreementItems.filter((ele) => {
                                let arraylist = purchaserScheduledList.filter((ele1) => {
                                    if (ele1.agreementLocationItemId === ele.id) {
                                        return true
                                    }
                                })
                                if (arraylist.length) {
                                    return false
                                } else {
                                    return true
                                }
                            })
                        }

                        if (agrmntPerson.Agreement.agreementItems.length) {
                            newMsSchedulableServices.push(agrmntPerson)
                        }
                    }
                }))
            }
            if (!schedulableServices) {
                schedulableServices = {}
                schedulableServices['agreementPersons'] = []
                schedulableServices['scheduledFuneralServices'] = []
            }
            schedulableServices.agreementPersons = [...schedulableServices.agreementPersons, ...newMsSchedulableServices]
            if (msSchedulableFuneralServices && msSchedulableFuneralServices.scheduledFuneralServices) {
                schedulableServices.scheduledFuneralServices = [...schedulableServices.scheduledFuneralServices, ...msSchedulableFuneralServices.scheduledFuneralServices]
            }

            let ss = []
            let css = []
            let cemeterymiscellaneousSales = []
            if (cemeterySchedulableServices && cemeterySchedulableServices.agreementPersons) {
                cemeterymiscellaneousSales = [...cemeterySchedulableServices.agreementPersons]
            }
            if (msSchedulableCemeteryServices && msSchedulableCemeteryServices.agreementPersons) {
                schedulableServices.agreementPersons = [...schedulableServices.agreementPersons, ...msSchedulableCemeteryServices.agreementPersons]
            }
            if (msSchedulableCemeteryServices && msSchedulableCemeteryServices.scheduledCemeteryServices) {
                schedulableServices.scheduledCemeteryServices = msSchedulableCemeteryServices.scheduledCemeteryServices
            }
            if (cemeterymiscellaneousSales && cemeterymiscellaneousSales.length) {
                css = await Promise.all(cemeterymiscellaneousSales.map(async agrmntPerson => {
                    let agmnt = agrmntPerson.Agreement
                    let agmntItems = agmnt.agreementItems
                    let cssArray = []
                    if (agrmntPerson.agreementRole && agmnt) {
                        if (agmntItems) {
                            cssArray = agmntItems.map(agmtItem => {
                                let addendumNumber = agmtItem.addendumDetails ? agmtItem.addendumDetails.addendumNumber : null
                                let [itemAttribute] = agmtItem.locationItem.Item.itemAttributes
                                let attributeVal = itemAttribute.AttributeValue
                                if (agmtItem.itemsUsage) {
                                    return agmtItem.itemsUsage.map(itemUsage => {
                                        let cemServ = this.transformScheduledCemeteryService(itemUsage.scheduledCemeteryService)
                                        let wo = cemServ ? cemServ.workOrder : null
                                        let woStatus = wo && wo.status ? wo.status.name : null
                                        let finalItemUsage = {
                                            schedulingAttribute: attributeVal.name,
                                            schedulingAttributeId: attributeVal.id,
                                            description: '',
                                            agreementType: this.TYPES[agmnt.type],
                                            itemAgreementType: _.get(agmtItem, 'locationItem.Item.ItemCategory.itemCategoryIndustry[0].ItemIndustry.name'),
                                            agreementId: agmnt.id,
                                            contractNumber: agmnt.contractNumber,
                                            addendumNumber: addendumNumber,
                                            due: agmnt.due,
                                            agreementLocationItemId: null,
                                            agreementPackageItemId: null,
                                            agreementCashAdvancedItemId: null,
                                            itemUsageId: itemUsage.id,
                                            scheduledFuneralService: null,
                                            scheduledCemeteryService: cemServ,
                                            workOrderStatus: woStatus
                                        }
                                        return finalItemUsage
                                    })
                                }
                                let cemServ = this.transformScheduledCemeteryService(agmtItem.scheduledCemeteryService)
                                let wo = cemServ ? cemServ.workOrder : null
                                let woStatus = wo && wo.status ? wo.status.name : null
                                return {
                                    schedulingAttribute: attributeVal.name,
                                    schedulingAttributeId: attributeVal.id,
                                    description: '',
                                    agreementType: this.TYPES[agmnt.type],
                                    itemAgreementType: _.get(agmtItem, 'locationItem.Item.ItemCategory.itemCategoryIndustry[0].ItemIndustry.name'),
                                    agreementId: agmnt.id,
                                    contractNumber: agmnt.contractNumber,
                                    addendumNumber: addendumNumber,
                                    due: agmnt.due,
                                    agreementLocationItemId: agmtItem.dataValues.id,
                                    agreementPackageItemId: null,
                                    agreementCashAdvancedItemId: null,
                                    itemUsageId: null,
                                    scheduledFuneralService: null,
                                    scheduledCemeteryService: cemServ,
                                    workOrderStatus: woStatus
                                }
                            })
                        }
                    }
                    return cssArray
                }))
                css = _.compact(_.flattenDeep(css))
            }
            if (schedulableServices && schedulableServices.agreementPersons) {
                ss = await Promise.all(schedulableServices.agreementPersons.map(async agrmntPerson => {
                    let agmnt = agrmntPerson.Agreement
                    let agmntItems = agmnt.agreementItems
                    let agmntCAI = agmnt.agreementCashAdvanceItems
                    let agmntPkg = agmnt && agmnt.agreementPackages && agmnt.agreementPackages.length ? agmnt.agreementPackages[0] : null
                    let pkgItems = agmntPkg ? agmntPkg.packageItems : []
                    let ssArray = []
                    let sds = schedulableServices.scheduledFuneralServices
                    if (agrmntPerson.agreementRole && agmnt) {
                        if (agmntItems) {
                            let scs
                            let cemServs = schedulableServices.scheduledCemeteryServices
                            if (cemServs && cemServs.length) {
                                scs = cemServs.map(s => {
                                    let serv = this.transformScheduledCemeteryService(s)
                                    return serv
                                })
                            }
                            ssArray.push(await getSSItems(agmntItems, 'locItem', agmnt, sds, scs))
                        }
                        if (pkgItems.length) {
                            ssArray.push(await getSSItems(pkgItems, 'package', agmnt, sds))
                        }
                        if (agmntCAI) {
                            ssArray.push(await getSSItems(agmntCAI, 'cai', agmnt, sds))
                        }
                    }
                    return ssArray
                }))
                ss = _.compact(_.flattenDeep(ss))
            }
            let finalResult = ss.concat(css)
            return finalResult
        } catch (error) {
            throw error
        }
    }

    static transformScheduledCemeteryService (service) {
        let cemServ = service
        if (cemServ) {
            cemServ = cemServ.toJSON()
            cemServ.schedulingDetails = cemServ.intermentInformationDetails && cemServ.intermentInformationDetails.beginningTime ? cemServ.intermentInformationDetails : cemServ.disintermentInformationDetails
            delete cemServ.intermentInformationDetails
            delete cemServ.disintermentInformationDetails
        }

        return cemServ
    }

    /**
     * Fetches agreement-items for given category
     * user story: ccs-6644
     * @param {*} personId is the id of a Person
     * @param {*} itemCategory is the name of the category for which to fetch the Agreement Items
     */
    static async getAgreementItems (personId, itemCategory, type) {
        let oldItemCategory = itemCategory
        if (itemCategory === 'casket') {
            let resourceQuery = `select DISTINCT ic.name as itemCategoryName from Item i inner join ItemCategory ic
            on i.itemCategoryId =ic.id
            INNER join ItemAttributeValue iav on i.id = iav.itemId
            inner join AttributeValue av on iav.attributeValueId = av.id
            inner join Attribute a on av.attributeId = a.id
            where av.name = 'CREMATION CONTAINER'`
            let serviceDeatils = await models.sequelize.query(resourceQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })
            itemCategory = ['Casket']
            itemCategory.push(...serviceDeatils.map((ele) => {
                return ele.itemCategoryName
            }))
        } else {
            itemCategory = [itemCategory]
        }
        const funeralagreementItems = await getMerchandiseItems('FUNERAL', personId, itemCategory)
        const msAgreementItems = await getMerchandiseItems('Miscellaneous Sales', personId, itemCategory)
        let agreementItems = []
        if (funeralagreementItems && funeralagreementItems.agreementPersons) {
            agreementItems = [...funeralagreementItems.agreementPersons]
        }
        if (msAgreementItems && msAgreementItems.agreementPersons) {
            agreementItems = [...agreementItems, ...msAgreementItems.agreementPersons]
        }
        let finalResult = []
        if (agreementItems && agreementItems.length) {
            finalResult = await Promise.all(agreementItems.map(async agrmntPerson => {
                let agmnt = agrmntPerson.Agreement
                let agmntItems = agmnt.agreementItems
                let agItems = []
                if (agrmntPerson.agreementRole && agmnt) {
                    if (agmntItems) {
                        let items = await Promise.all(agmntItems.map(item => {
                            let ai = {
                                agreementLocationItemId: item.id,
                                itemName: item.locationItem.Item.name,
                                itemUsageId: null
                            }
                            // Refer getSSArray Method
                            let aItems = getSSArray(ai, item.agreementItemPrice.quantity)
                            return aItems
                        }))
                        agItems.push(items)
                    }
                }
                return agItems
            }))
            finalResult = _.compact(_.flattenDeep(finalResult))
        }
        let itemUsageController = new ItemUsageController(personId)
        let res = await itemUsageController.getSelectedMerchandiseItems('Merchandises', oldItemCategory)
        res = res.map((item) => {
            delete item.itemCode
            delete item.itemPrice
            delete item.contractNumber
            return item
        })
        finalResult = finalResult.concat(res)
        return finalResult
    }

    /**
     * Fetches Urn Types
     * user story: ccs-6651
     */
    static getUrnTypes () {
        let urnTypes = models.AttributeValue.findAll({
            attributes: ['id', 'name'],
            include: [
                {
                    model: models.Attribute,
                    as: 'attribute',
                    where: {
                        name: 'Urn Type'
                    },
                    attributes: []
                }
            ]
        })
        return urnTypes
    }

    /**
     * Fetch details of scheduled funeral service
     * user story: ccs-6648
     * @param {*} personId  is the id of a Person
     * @param {*} sfsId is the id of scheduled funeral service
     */
    async getScheduledFuneralServiceDetails (personId, sfsId, transaction) {
        try {
            if (personId && sfsId) {
                let result = await models.ScheduledFuneralService.scope(
                    'schedulingSectionScope',
                    'cemeteryInformationScope',
                    'resourceSectionScope',
                    'subServicesSectionScope',
                    'casketSectionScope',
                    'urnInformationScope',
                    'personScope',
                    'agreementLocationItemScope',
                    'agreementPackageItemScope',
                    'agreementCAItemScope',
                    'schedulingFileScope')
                    .findOne({
                        where: { personId, id: sfsId },
                        attributes: ['id', 'personId', 'agreementLocationItemId', 'agreementPackageItemId', 'agreementCashAdvancedItemId'],
                        transaction
                    })
                if (result) {
                    result = result.toJSON ? result.toJSON() : result
                    if (result.schedulingFile) {
                        if ((result.schedulingFile && result.schedulingFile.schedulingFileUrl && result.schedulingFile.schedulingFileUrl.originalFileName) || result.fileUrl) {
                            result.schedulingFile.fileUrl = await commonDownloadFileWithSignature(result.schedulingFile.schedulingFileUrl, result.fileUrl)
                        }
                    }
                    let resourcesSectionNotesData
                    if (result.resourcesDetails && result.resourcesDetails.id) {
                        resourcesSectionNotesData = await models.ResourceSection.findOne({
                            where: {
                                id: result.resourcesDetails.id
                            },
                            include: [{
                                model: models.Note,
                                as: 'resourceSectionNotes',
                                where: { resourceType: 'ResourceSection', resourceId: result.resourcesDetails.id },
                                attributes: ['id', 'content', 'categoryId', 'createdAt'],
                                include: [{
                                    model: models.User,
                                    as: 'createdByUser',
                                    attributes: ['name']
                                },
                                {
                                    model: models.NoteLevel,
                                    as: 'noteLevel',
                                    attributes: ['name']
                                }, {
                                    model: models.NoteCategory,
                                    as: 'NoteCategory',
                                    where: { name: 'Funeral Scheduling Resource Section' },
                                    attributes: []
                                }
                                ]
                            }],
                            transaction
                        })
                        result.resourcesDetails.resourceSectionNotes = resourcesSectionNotesData ? resourcesSectionNotesData.resourceSectionNotes : null
                    }
                    if (result.schedulingDetails && result.schedulingDetails.reservedChapel) {
                        result.schedulingDetails.reservedChapel.chapelId = result.schedulingDetails.reservedChapel.reservedChapelDetails.id
                        result.schedulingDetails.reservedChapel.chapelName = result.schedulingDetails.reservedChapel.reservedChapelDetails.name
                        delete result.schedulingDetails.reservedChapel.resourceType
                        delete result.schedulingDetails.reservedChapel.resourceId
                        delete result.schedulingDetails.reservedChapel.reservedChapelDetails
                    }
                    if (result.resourcesDetails && result.resourcesDetails.pallbearers && result.resourcesDetails.pallbearers.length) {
                        result.resourcesDetails.pallbearers = result.resourcesDetails.pallbearers.map(pallbearer => {
                            let pc = pallbearer.PersonContact
                            return {
                                contactId: pc.id,
                                name: pc.employee ? pc.employee.name : pc.person ? [pc.person.firstName, pc.person.middleName, pc.person.lastName].join(' ').trim() : null,
                                email: pc.employee ? pc.employee.email : pc.person ? pc.person.email : null
                            }
                        })
                    } else {
                        if (result.resourcesDetails) {
                            result.resourcesDetails.pallbearers = []
                        }
                    }
                    let notesFromStaff = []
                    let notesFromFamily = []
                    if (result.resourcesDetails && result.resourcesDetails.resourceSectionNotes && result.resourcesDetails.resourceSectionNotes.length) {
                        notesFromFamily = result.resourcesDetails.resourceSectionNotes.filter(r => r.noteLevel.name === 'family')
                        notesFromStaff = result.resourcesDetails.resourceSectionNotes.filter(r => r.noteLevel.name === 'staff')
                        result.resourcesDetails.notesFromFamily = notesFromFamily
                        result.resourcesDetails.notesFromStaff = notesFromStaff
                        delete result.resourcesDetails.resourceSectionNotes
                    } else {
                        if (result.resourcesDetails) {
                            result.resourcesDetails.notesFromFamily = notesFromFamily
                            result.resourcesDetails.notesFromStaff = notesFromStaff
                            delete result.resourcesDetails.resourceSectionNotes
                        }
                    }
                    if (result.subServicesDetails && result.subServicesDetails.length) {
                        result.subServicesDetails.map(s => {
                            s.subServiceName = s.subService.name
                            delete s.subService
                            return s
                        })
                    }
                    getCasketDetailsSection(result)
                    getUrnDetailsSection(result)
                    if (result.person && result.person.personVerificationDetails) {
                        result.person.onePortalId = result.person.personVerificationDetails.onePortalId
                        delete result.person.personVerificationDetails
                    }
                    let item = result.agreementLocationItem ? 'agreementLocationItem' : result.agreementPackageItem ? 'agreementPackageItem' : result.agreementCashAdvancedItem ? 'agreementCashAdvancedItem' : null
                    if (item) {
                        result.serviceName = result[item].locationItem.Item.itemAttributes[0].AttributeValue.name
                        let agreementData = item === 'agreementPackageItem' ? result[item].agreementPackage : result[item]
                        let type = agreementData.agreementDetails.type
                        result.serviceType = SchedulingController.TYPES[type]
                        result.contractNumber = agreementData.agreementDetails.contractNumber
                        result.addendumNumber = agreementData.addendumDetails ? agreementData.addendumDetails.addendumNumber : null
                        delete result.agreementLocationItem
                        delete result.agreementPackageItem
                        delete result.agreementCashAdvancedItem
                    }
                    return result
                } else {
                    throw new Error('SCHEDULABLE_FUNERAL_SERVICE_NOT_FOUND')
                }
            } else {
                throw new Error('PERSONID_AND_SCHEDULEDFUNERALSERVICEID_ARE_REQUIRED')
            }
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    /**
      * delete resource pallbearers
      * @param {Number} contactId
      */
    static async deleteResourcePallbearers (contactId, transaction) {
        let t
        try {
            if (transaction) {
                t = transaction
            } else {
                t = await models.sequelize.transaction()
            }
            await models.ResourcePallbearer.destroy({ where: { contactId }, transaction: t })
            await t.commit()
            return true
        } catch (err) {
            await t.rollback()
            throw err
        }
    }

    /**
     * Fetch list of sub services
     * user story: ccs-6681
     */
    static getSubServices () {
        return models.SubService.findAll({})
    }

    /**
     * Update scheduled cremation service date / time
     * @param {*} reqData is object
     * @param {integer} reqData.id
     * @param {integer} reqData.personId
     * @param {integer} reqData.agreementLocationItemId
     * @param {object} reqData.schedulingDetails
     * @param {date} reqData.schedulingDetails.date
     * @param {date} reqData.schedulingDetails.beginningTime
     * @param {date} reqData.schedulingDetails.endingTime
     */
    async updateScheduledDateTime (reqData) {
        try {
            let result
            let woDetails = await WorkOrderController.getWorkOrderDetails(reqData.workOrderId)
            if ((_.get(woDetails, 'statusId') !== 1 && _.get(woDetails, 'statusId') !== 2 && !_.get(woDetails, 'deletedBy')) || (_.get(woDetails, 'statusId') === 1 && _.get(woDetails, 'deletedBy'))) {
                throw new Error('NOT_A_UNASSIGNED_WO')
            }
            if (_.get(woDetails, 'schedulingDetails.serviceType') === 'Funeral' || _.get(woDetails, 'schedulingDetails.serviceType') === 'Miscellaneous Sales') {
                if (_.get(woDetails, 'schedulingDetails.serviceName').search('Cremation Service') === -1) {
                    throw new Error('NOT_A_CREAMATION_SERVICE')
                }
                let fnReqBody = {
                    'id': _.get(woDetails, 'schedulingDetails.id'),
                    'agreementLocationItemId': _.get(woDetails, 'schedulingDetails.agreementLocationItemId'),
                    'agreementCashAdvancedItemId': _.get(woDetails, 'schedulingDetails.agreementCashAdvancedItemId'),
                    'serviceType': _.get(woDetails, 'schedulingDetails.serviceType'),
                    'personId': reqData.personId,
                    'userId': reqData.userId,
                    'schedulingDetails': {
                        'id': _.get(woDetails, 'schedulingDetails.schedulingDetails.id'),
                        'beginningTime': reqData.beginningTime,
                        'date': reqData.beginningTime,
                        'endingTime': reqData.endingTime,
                        'clFacilityLocationId': _.get(woDetails, 'schedulingDetails.schedulingDetails.clFacilityLocation.id', null),
                        'serviceLocationId': _.get(woDetails, 'schedulingDetails.schedulingDetails.serviceLocation.id', null),
                        'reservedChapelId': _.get(woDetails, 'schedulingDetails.schedulingDetails.reservedChapel.id', null),
                        'cremationType': _.get(woDetails, 'schedulingDetails.schedulingDetails.cremationType', null)
                    },
                    'fromWO': true
                }
                result = await this.createOrUpdateScheduledFuneralService(fnReqBody)
            } else {
                if (_.get(woDetails, 'schedulingDetails.serviceName').search('Cremation Service') === -1) {
                    throw new Error('NOT_A_CREAMATION_SERVICE')
                }
                let scheduledItemId = await models.sequelize.query(`select scs.itemUsageId, scs.agreementLocationItemId from ScheduledCemeteryService scs
                inner join WorkOrder wo ON wo.resourceId = scs.id
                where wo.resourceType = 'ScheduledCemeteryService'
                and wo.id = ${reqData.workOrderId}`, { type: models.sequelize.QueryTypes.SELECT })
                let cmReqBody = {
                    'id': _.get(woDetails, 'schedulingDetails.id'),
                    'itemUsageId': _.get(woDetails, 'schedulingDetails.itemUsageId'),
                    'serviceType': _.get(woDetails, 'schedulingDetails.serviceType'),
                    'personId': reqData.personId,
                    'userId': reqData.userId,
                    'intermentInformationDetails': {
                        'id': _.get(woDetails, 'schedulingDetails.intermentInformationDetails.id'),
                        'beginningTime': reqData.beginningTime,
                        'endingTime': reqData.endingTime,
                        'temporaryBurialLocationId': _.get(woDetails, 'schedulingDetails.intermentInformationDetails.temporaryBurialLocationId', null),
                        'temporaryDisintermentLocationId': _.get(woDetails, 'schedulingDetails.intermentInformationDetails.temporaryDisintermentLocationId', null),
                        'memorialInformation': _.get(woDetails, 'schedulingDetails.intermentInformationDetails.memorialInformation', null),
                        'isPreburied': _.get(woDetails, 'schedulingDetails.intermentInformationDetails.isPreburied', null),
                        'cremationType': _.get(woDetails, 'schedulingDetails.intermentInformationDetails.cremationType', null)
                    },
                    'fromWO': true,
                    'isMiscSalesService': !_.get(scheduledItemId, '[0].itemUsageId'),
                    'agreementLocationItemId': _.get(scheduledItemId, '[0].agreementLocationItemId', null)
                }
                result = await this.createOrUpdateScheduledCemeteryService(cmReqBody)
            }

            // Note: If the work order contains person remains transfer id, update the neededByDate with the updated service date.
            if (woDetails.personRemainsTransferId) {
                await models.PersonRemainsTransfer.update({
                    deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                    deletedBy: reqData.userId
                }, {
                    where: {
                        id: woDetails.personRemainsTransferId
                    }
                })
            }

            return result
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    /**
     * Create/update scheduled funeral service
     * @param {*} reqData is object
     * @param {integer} reqData.id
     * @param {integer} reqData.personId
     * @param {integer} reqData.agreementLocationItemId
     * @param {integer} reqData.agreementPackageItemId
     * @param {integer} reqData.agreementCashAdvancedItemId
     * @param {object} reqData.schedulingDetails
     * @param {date} reqData.schedulingDetails.date
     * @param {date} reqData.schedulingDetails.beginningTime
     * @param {date} reqData.schedulingDetails.endingTime
     * @param {integer} reqData.schedulingDetails.clFacilityLocationId is location id
     * @param {integer} reqData.schedulingDetails.serviceLocationId is organization id
     * @param {integer} reqData.schedulingDetails.reservedChapel.id
     * @param {integer} reqData.schedulingDetails.reservedChapel.chapelId
     * @param {date} reqData.schedulingDetails.reservedChapel.reservationDate reserved chapel date and timings are in between scheduling details beginning time and ending time.
     * @param {date} reqData.schedulingDetails.reservedChapel.startTime
     * @param {date} reqData.schedulingDetails.reservedChapel.endTime
     * @param {date} reqData.schedulingDetails.cremationType
     * @param {date} reqData.schedulingDetails.graveSideReason
     * @param {object} reqData.cemeteryInformationDetails
     * @param {object} reqData.cemeteryInformationDetails.id
     * @param {integer} reqData.cemeteryInformationDetails.clCemeteryLocationId
     * @param {integer} reqData.cemeteryInformationDetails.cemeteryLocationId
     * @param {string} reqData.cemeteryInformationDetails.burialSite
     * @param {object} reqData.resourcesDetails
     * @param {integer} reqData.resourcesDetails.id
     * @param {boolean} reqData.resourcesDetails.isHearseNeeded
     * @param {boolean} reqData.resourcesDetails.isUtilityCarNeeded
     * @param {integer} reqData.resourcesDetails.crematoryId
     * @param {date} reqData.resourcesDetails.crematoryDate
     * @param {date} reqData.resourcesDetails.crematoryStartTime
     * @param {date} reqData.resourcesDetails.crematoryEndTime
     * @param {array} reqData.resourcesDetails.pallbearers eg: [1,2,3]
     * @param {array} reqData.resourcesDetails.notesFromFamily
     * @param {integer} reqData.resourcesDetails.notesFromFamily.id
     * @param {text} reqData.resourcesDetails.notesFromFamily.content
     * @param {array} reqData.resourcesDetails.notesFromStaff
     * @param {integer} reqData.resourcesDetails.notesFromStaff.id
     * @param {text} reqData.resourcesDetails.notesFromStaff.content
     * @param {array} reqData.subServicesDetails
     * @param {integer} reqData.subServicesDetails.id
     * @param {integer} reqData.subServicesDetails.subServiceId
     * @param {date} reqData.subServicesDetails.startTime
     * @param {date} reqData.subServicesDetails.endTime
     * @param {object} reqData.casketDetails
     * @param {integer} reqData.casketDetails.id
     * @param {boolean} reqData.casketDetails.isOutSideCasket
     * @param {integer} reqData.casketDetails.casketId
     * @param {string} reqData.casketDetails.casketType
     * @param {object} reqData.urnInformationDetails
     * @param {integer} reqData.urnInformationDetails.id
     * @param {boolean} reqData.urnInformationDetails.isFamilyOwnedUrn
     * @param {number} reqData.urnInformationDetails.urnId
     * @param {string} reqData.urnInformationDetails.height
     * @param {string} reqData.urnInformationDetails.width
     * @param {string} reqData.urnInformationDetails.depth
     * @param {integer} reqData.urnInformationDetails.urnType
     * @param {string} reqData.urnInformationDetails.urnStatus
     * @param {date} reqData.urnInformationDetails.receivedDate
     * @param {boolean} reqData.urnInformationDetails.isTransferRequired
     */
    async createOrUpdateScheduledFuneralService (reqData) {
        try {
            // To check Scheduled Cemetery service already created
            let agreementDetails = {
                'agreementLocationItemId': 'AgreementLocationItem',
                'agreementPackageItemId': 'AgreementPackageItem',
                'agreementCashAdvancedItemId': 'AgreementCashAdvancedItem'
            }
            const funeralService = await models.ScheduledFuneralService.findAll({ where: {
                personId: reqData.personId,
                agreementLocationItemId: _.get(reqData, 'agreementLocationItemId', null),
                agreementPackageItemId: _.get(reqData, 'agreementPackageItemId', null),
                agreementCashAdvancedItemId: _.get(reqData, 'agreementCashAdvancedItemId', null),
                deletedAt: null,
                deletedBy: null
            } })

            let agreementTable
            Object.keys(agreementDetails).map((ele) => {
                if (reqData[ele]) {
                    agreementTable = ele
                }
            })
            let agreementQuantity
            if (['agreementLocationItemId', 'agreementCashAdvancedItemId'].includes(agreementTable)) {
                let query = `Select atp.quantity FROM ${agreementDetails[agreementTable]} ali
                  INNER JOIN AgreementItemPrice atp on atp.id =  ali.agreementItemPriceId
                  where ali.id = ${reqData[agreementTable]}`
                agreementQuantity = await models.sequelize.query(query, {
                    type: models.sequelize.QueryTypes.SELECT
                })
            } else if (['agreementPackageItemId'].includes(agreementTable)) {
                let query = `Select atp.quantity FROM ${agreementDetails[agreementTable]} ali
                INNER JOIN AgreementPackage ap on ap.id =  ali.agreementPackageId
                INNER JOIN AgreementItemPrice atp on atp.id =  ap.agreementItemPriceId
                where ali.id = ${reqData[agreementTable]}`
                agreementQuantity = await models.sequelize.query(query, {
                    type: models.sequelize.QueryTypes.SELECT
                })
            }
            if (!reqData.id && agreementQuantity.length && funeralService.length >= agreementQuantity[0].quantity) {
                throw new Error('Scheduled Funeral service already created. Please refresh')
            }
            // TODO: fetch work order to check whether status of work order is in closed status or not -- Venu
            let workOrder
            if (reqData.id) {
                workOrder = await models.WorkOrder.scope('notDeleted', 'withStatus').findOne({
                    where: {
                        resourceType: 'ScheduledFuneralService',
                        resourceId: reqData.id
                    }
                })
            }
            logger.info(`Create/update scheudling checking for work order status`)
            if (_.get(workOrder, 'status.name') !== 'closed') {
                logger.info(`Create/update scheudling checking for work order status and status is not closed`)
                const result = await models.sequelize.transaction(async (transaction) => {
                    let schedulingSectionId, cemeteryInformationSectionId, resourceSectionId, casketSectionId, urnInformationSectionId
                    if (!_.isEmpty(reqData.schedulingDetails)) {
                        const schedulingSectionInstance = new SchedulingSectionController()
                        const createdSchedulingRecord = await schedulingSectionInstance.upsertSchedulingSection(reqData.schedulingDetails, reqData.id, reqData.userId, reqData.timezone, transaction, reqData.fromWO)
                        schedulingSectionId = createdSchedulingRecord.id
                    } else {
                        throw new Error('SCHEDULING_DETAILS_ARE_REQUIRED_FOR_SCHEDULING')
                    }
                    if (!_.isEmpty(reqData.cemeteryInformationDetails)) {
                        const cemeteryInfoSectionInstance = new CemeteryInfoSectionController()
                        const createdCemeteryInfoRecord = await cemeteryInfoSectionInstance.upsertCemeteryInfoSection(reqData.cemeteryInformationDetails, transaction)
                        cemeteryInformationSectionId = createdCemeteryInfoRecord.id
                    }
                    if (!_.isEmpty(reqData.resourcesDetails)) {
                        const resourceSectionInstance = new ResourceSectionController()
                        const createdResourceRecord = await resourceSectionInstance.upsertResourceSection(reqData.resourcesDetails, reqData.userId, transaction)
                        resourceSectionId = createdResourceRecord.id
                    }
                    if (!_.isEmpty(reqData.casketDetails)) {
                        const casketSectionInstance = new CasketSectionController()
                        const createdCasketeRecord = await casketSectionInstance.upsertCasketSection(reqData.casketDetails, transaction, reqData.userId, 'Funeral')
                        casketSectionId = createdCasketeRecord.id
                    }
                    if (!_.isEmpty(reqData.urnInformationDetails)) {
                        const urnInfoInstance = new UrnInfoSectionController()
                        const createdUrnInfoRecord = await urnInfoInstance.upsertUrnInfoSection(reqData.urnInformationDetails, transaction, reqData.userId, 'Funeral')
                        urnInformationSectionId = createdUrnInfoRecord.id
                    }
                    let inputObj = {
                        id: reqData.id,
                        personId: reqData.personId,
                        agreementLocationItemId: reqData.agreementLocationItemId,
                        agreementPackageItemId: reqData.agreementPackageItemId,
                        agreementCashAdvancedItemId: reqData.agreementCashAdvancedItemId,
                        schedulingSectionId,
                        cemeteryInformationSectionId,
                        resourceSectionId,
                        casketSectionId,
                        urnInformationSectionId
                    }
                    const createdResult = await upsert('ScheduledFuneralService', inputObj, transaction, { userId: reqData.userId })
                    logger.info(`Create/update scheudling, if create scheduling, creating work order`)
                    // TODO: Create work order -- Venu Done
                    if (createdResult) {
                        // Creating urnTransfer entry
                        if (!_.isEmpty(reqData.urnInformationDetails)) {
                            const UrnTransferInstance = new UrnTransferController()
                            let urnTransferPayload = { ...reqData, id: createdResult.id }
                            await UrnTransferInstance.upsertUrnTransferDetails(urnTransferPayload, 'ScheduledFuneralService', transaction)
                        }
                        // call create work order function
                        const woPayload = {
                            resourceType: 'ScheduledFuneralService',
                            resourceId: createdResult.id
                        }

                        if (!inputObj.id && !reqData.schedulingDetails.graveSideReason) {
                            await WorkOrderController.createWorkOrder(woPayload, reqData.userId, transaction)
                            logger.info(`Create/update scheudling, work order creation done`)
                        } else if (!reqData.schedulingDetails.graveSideReason) {
                            if (!_.isEmpty(workOrder)) {
                                const workOrderScheduleDetails = await WorkOrderController.getWorkOrderDetails(workOrder.id, transaction)
                                // to remove all resources of workorder and set to  unassigned state
                                if (workOrderScheduleDetails.schedulingDetails.schedulingDetails.beginningTime !== reqData.schedulingDetails.beginningTime || workOrderScheduleDetails.schedulingDetails.schedulingDetails.endTime !== reqData.schedulingDetails.endingTime) {
                                    await WorkOrderController.removeWorkOrderScheduleAndResources(createdResult.id, 'ScheduledFuneralService', reqData.userId, transaction, true, reqData.fromWO)

                                    // Triggering Email notification if there is a change in Date and time
                                    if (workOrder.statusId === 2) {
                                        await this.scheduleServiceDateUpdateEmailNotification(reqData, 'Funeral', transaction)
                                    }
                                }
                            } else {
                                await WorkOrderController.createWorkOrder(woPayload, reqData.userId, transaction)
                            }
                        }

                        // When graveside reason checkbox is selected, execute the following steps
                        // 1. If there is already a work order for the scheduled service, soft delete it.
                        // 2. If there is no related work order, then do nothing.
                        if (reqData.schedulingDetails.graveSideReason) {
                            // Checking if there's a work order for the scheduled service
                            let workOrder = await models.WorkOrder.findAll({
                                where: {
                                    resourceType: woPayload.resourceType,
                                    resourceId: woPayload.resourceId,
                                    deletedAt: null,
                                    deletedBy: null
                                },
                                transaction
                            })
                            // Soft deleting the work order if there's any.
                            if (workOrder.length) {
                                await WorkOrderController.deleteWorkOrder(woPayload.resourceId, woPayload.resourceType, reqData.userId, reqData.timezone, transaction)
                            }
                        }
                    }
                    if (reqData.subServicesDetails) {
                        const subServicesSectionInstance = new SubServicesSectionController()
                        await subServicesSectionInstance.upsertSubServicesSection(reqData.subServicesDetails, createdResult.id, transaction)
                    }
                    if (!_.isEmpty(reqData.schedulingFile) && createdResult) {
                        reqData.schedulingFile.schedulingType = 'funeral'
                        reqData.schedulingFile.schedulingId = createdResult.id
                        const schedulingFileController = new SchedulingFileController()
                        await schedulingFileController.upsertSchedulingFileSection(reqData.schedulingFile, transaction)
                    }

                    return createdResult
                })

                // adding webcem job into queue
                const { queueNames, queues } = require('../../../appQueues')
                const webCemQueue = queues[queueNames.webCemQueue]
                const dataToSend = {
                    event: 'decedent.save',
                    payload: {
                        personId: reqData.personId,
                        userId: reqData.userId
                    }
                }
                webCemQueue.add('webCemQueue', dataToSend)
                if (result) {
                    const sfs = await this.getScheduledFuneralServiceDetails(reqData.personId, result.id)

                    /**
                     * Syncing scheduling details to FAA
                     */
                    // const cremationController = new CremationSyncController(reqData.personId)
                    // await cremationController.updateCremationServices()
                    faaWorker.addQueue({ personId: reqData.personId, faaWorker_event: 'syncCremationData' })
                    return sfs
                } else {
                    logger.error('Error while creating scheduledFuneralService')
                    throw new Error('SCHEDULING_CREATION_FAILED')
                }
            } else {
                logger.error(`Create/update scheudling, respective work order status is closed`)
                throw new Error('THIS_SCHEDULE_CAN_NOT_BE_EDITITED_BECAUSE_RELATED_WORK_ORDER_IS_CLOSED')
            }
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    /**
     * Deletes Scheduled Funeral Service
     * @param {*} agreementId is the id of Agreement
     * @param {*} data is the data of record to be updated
     * @param {*} userId is the id of User
     * @param {string} timezone
     * @param {*} transaction
     */
    static async deleteScheduledFuneralServices (agreementId, data, userId, timezone, transaction, model = 'ScheduledFuneralService') {
        try {
            const AgreementController = require('../agreementController/agreementController')
            const agreementController = new AgreementController(agreementId)
            const agreement = await agreementController.getAgreementDetails(transaction)
            let [beneficiary] = agreement.beneficiary
            let purchaser = agreement.purchaser
            // TODO: why we are dependent on beneficiary or purchaser, can we change this to scheduled funeral service id
            let personId = []
            // TODO: below if condition might not be required just to not have issues in prod
            if (beneficiary && beneficiary.personId) {
                personId.push(beneficiary.personId)
            }
            if (purchaser && purchaser.personId) {
                personId.push(purchaser.personId)
            }
            let condition = {
                deletedAt: null,
                deletedBy: null
            }
            if (personId) {
                condition.personId = personId
            }
            let scheduledServices
            let res; let completedItems = []; let notCompletedItems = []; let schedulingServiceDetails = []
            if (data.agreementLocationItemId) {
                condition['agreementLocationItemId'] = data.agreementLocationItemId
            }
            if (data.agreementCashAdvancedItemId) {
                condition['agreementCashAdvancedItemId'] = data.agreementCashAdvancedItemId
            }
            if (data.agreementPackageItemId) {
                condition['agreementPackageItemId'] = data.agreementPackageItemId
            }
            let as = model === 'ScheduledFuneralService' ? 'service' : 'cemeteryService'
            let includeData = {
                model: models[model],
                as: as,
                where: condition,
                require: true,
                order: [
                    ['createdAt', 'DESC']
                ]
            }
            if ((beneficiary || purchaser) && data.quantity && ((data.itemCategoryName === 'Merchandises' && data.merchandisesType) || data.itemCategoryName === 'Services' || data.itemCategoryName === 'Cash Advance')) {
                if (data.itemCategoryName === 'Services' || data.itemCategoryName === 'Cash Advance') {
                    scheduledServices = await models.WorkOrder.findAll({
                        where: {
                            resourceType: model,
                            deletedAt: null,
                            deletedBy: null
                        },
                        include: [includeData],
                        transaction
                    })
                    scheduledServices.map((item) => {
                        if (!item.completedOn) {
                            if (item[as] && item[as].id) {
                                notCompletedItems.push(item[as].id)
                                schedulingServiceDetails.push(item[as])
                            } else if (item[as].id) {
                                schedulingServiceDetails.push(item[as])
                            }
                        } else {
                            completedItems.push(item[as].id)
                        }
                        return item[as]
                    })
                } else if (data.merchandisesType) {
                    let query
                    if (data.merchandisesType === 'Urn') {
                        query = getCommonQueryMerchandise('UrnInformationSection', 'urnId', 'urnInformationSectionId', data.agreementLocationItemId)
                    } else if (data.merchandisesType === 'Casket') {
                        query = getCommonQueryMerchandise('CasketSection', 'casketId', 'casketSectionId', data.agreementLocationItemId)
                    }

                    let serviceDeatils = await models.sequelize.query(query, {
                        type: models.sequelize.QueryTypes.SELECT,
                        transaction
                    })

                    serviceDeatils.map((item) => {
                        if (!item.completedOn) {
                            notCompletedItems.push(item.funeralScheduling || item.cemeteryScheduling)
                            schedulingServiceDetails.push(item)
                        } else {
                            completedItems.push(item.funeralScheduling || item.cemeteryScheduling)
                        }
                        return item.service
                    })
                }
            }

            if ((beneficiary || purchaser) && data.itemCategoryName === 'Package') {
                scheduledServices = await models.WorkOrder.findAll({
                    where: {
                        resourceType: model,
                        deletedAt: null,
                        deletedBy: null
                    },
                    include: [includeData],
                    transaction
                })
                scheduledServices.map((item) => {
                    if (!item.completedOn) {
                        if (item[as] && item[as].id) {
                            notCompletedItems.push(item[as].id)
                            schedulingServiceDetails.push(item[as])
                        } else if (item[as].id) {
                            schedulingServiceDetails.push(item[as])
                        }
                    } else {
                        completedItems.push(item[as].id)
                    }
                    return item[as]
                })
            }
            if ((!data.removeAll && (((data.itemCategoryName === 'Services' || data.itemCategoryName === 'Cash Advance' || data.itemCategoryName === 'Package') && data.quantity === completedItems.length) || (data.itemCategoryName === 'Merchandises' && data.quantity <= completedItems.length))) || (data.removeAll && completedItems.length)) {
                throw new Error('ITEM(S)_UTILIZED_CANNOT_BE_UPDATED_OR_REMOVED')
            }

            if ((!data.removeAll && (((data.itemCategoryName === 'Services' || data.itemCategoryName === 'Cash Advance' || data.itemCategoryName === 'Package') && (data.quantity - completedItems.length) === notCompletedItems.length) || (data.itemCategoryName === 'Merchandises' && data.quantity - completedItems.length > 0 && (data.quantity - completedItems.length) <= notCompletedItems.length))) || (data.removeAll && notCompletedItems.length)) {
                if (data.itemCategoryName === 'Services' || data.itemCategoryName === 'Cash Advance' || data.itemCategoryName === 'Package') {
                    res = await models[model].update({
                        deletedAt: new Date(),
                        deletedBy: userId
                    }, {
                        where: {
                            id: { [Op.in]: !data.removeAll ? [notCompletedItems[0]] : [...notCompletedItems] }
                        },
                        transaction
                    })
                }
                let casketIds = []; let urnIds = []
                schedulingServiceDetails = !data.removeAll ? [schedulingServiceDetails[0]] : schedulingServiceDetails
                schedulingServiceDetails.map((ele) => {
                    if (ele.casketSectionId) {
                        casketIds.push(ele.casketSectionId)
                    }
                    if (ele.urnInformationSectionId) {
                        urnIds.push(ele.urnInformationSectionId)
                    }
                })
                if (casketIds.length || urnIds.length) {
                    await models.CasketSection.update({
                        casketId: null,
                        resourceType: null
                    }, {
                        where: {
                            id: { [Op.in]: casketIds }
                        },
                        transaction
                    })
                    await models.UrnInformationSection.update({
                        urnId: null,
                        resourceType: null
                    }, {
                        where: {
                            id: { [Op.in]: urnIds }
                        },
                        transaction
                    })
                }
            }
            // TODO: Delete Work order -- venu - done
            let deletedFunerlServices = !data.removeAll ? [notCompletedItems[0]] : [...notCompletedItems]
            if ((data.itemCategoryName === 'Services' || data.itemCategoryName === 'Cash Advance' || data.itemCategoryName === 'Package') && deletedFunerlServices && deletedFunerlServices.length) {
                logger.info(`Delete scheudling, deleting respective work order started`)
                await Promise.all(deletedFunerlServices.map(async (id) => {
                    let deleteRes
                    if (id) {
                        deleteRes = await WorkOrderController.deleteWorkOrder(
                            id,
                            model,
                            userId,
                            timezone,
                            transaction
                        )
                        // Deleting the corresponding urnTransferDetails
                        const UrnTransferInstance = new UrnTransferController()
                        await UrnTransferInstance.deleteUrnTransfer(
                            id,
                            model,
                            userId,
                            transaction
                        )
                    }
                    return deleteRes
                }))
                logger.info(`Delete scheudling, deleting respective work order  done`)
            }
            return res
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    /** CCS-7377
    * get funral arrangement details with funeral director and funeral location Details
    * @param {Number} personId
    * @param {String} serviceName
    */
    static async getFuneralArrangementDetails (personId, serviceName) {
        try {
            let funeralArrangementDeials =
        {
            funeralDirectorDetails: null,
            funeralLocationDetails: {
                clFacilityLocation: null,
                serviceLocation: null
            }
        }
            if (personId && serviceName) {
                if (serviceName === 'Cemetery Witness Cremation Services') {
                    serviceName = 'Cemetery Witness Cremation Service'
                }
                serviceName = serviceName.replace('Cemetery', 'Funeral')
                const personController = new PersonController(personId)
                await personController.getDetails()
                const ssQuery = getCommonQueryFuneralArragement(personId, serviceName)
                const schedulableServices = await models.Person.findOne(ssQuery)
                let schedulableFuneralServices
                if (schedulableServices && schedulableServices.scheduledFuneralServices.length) {
                    schedulableFuneralServices = schedulableServices.scheduledFuneralServices.filter((schedulableService) => {
                        if (schedulableService.agreementLocationItem || schedulableService.agreementPackageItem || schedulableService.agreementCashAdvancedItem) return true
                    })
                    // if (schedulableFuneralServices.length) {
                    //     const workOrderOwnerDetails = schedulableFuneralServices.filter((schedulableService) => {
                    //         if (schedulableService.workOrder.workOrderOwner) return true
                    //     })
                    //     const [results] = workOrderOwnerDetails.length ? workOrderOwnerDetails : this._getLocationsDetails(schedulableFuneralServices)
                    //     funeralArrangementDeials.funeralDirectorDetails = results.workOrder.workOrderOwner
                    //     funeralArrangementDeials.funeralLocationDetails.clFacilityLocation = results.schedulingDetails.clFacilityLocation
                    //     funeralArrangementDeials.funeralLocationDetails.serviceLocation = results.schedulingDetails.serviceLocation
                    // }
                    const [results] = schedulableFuneralServices
                    funeralArrangementDeials.funeralDirectorDetails = results.workOrder ? results.workOrder.workOrderOwner : null
                    funeralArrangementDeials.funeralLocationDetails.clFacilityLocation = results.schedulingDetails.clFacilityLocation
                    funeralArrangementDeials.funeralLocationDetails.serviceLocation = results.schedulingDetails.serviceLocation
                }
            }
            return { ...funeralArrangementDeials }
        } catch (error) {
            return error
        }
    }

    // /**
    //  * filtering clFacilityLocation, serviceLocation not equal to null
    //   * @param {Object} schedulableFuneralServices
    //  */
    // static _getLocationsDetails (schedulableFuneralServices) {
    //     let locationsDetails = schedulableFuneralServices
    //     if (schedulableFuneralServices.length > 1) {
    //         let locationsItems = schedulableFuneralServices.filter((funeralService) => {
    //             return funeralService.schedulingDetails.clFacilityLocation || funeralService.schedulingDetails.serviceLocation
    //         })
    //         if (locationsItems.length) {
    //             locationsDetails = locationsItems
    //         }
    //     }
    //     return locationsDetails
    // }

    /**
     * CCS-7488
     * get scheduling cemetery services details
     * @param {Number} personId
     * @param {NUmber} scsId
     * @param {*} transaction
     */
    async getScheduledCemeteryServiceDetails (personId, scsId, transaction, isMiscSales) {
        try {
            if (personId && scsId) {
                const personController = new PersonController(personId)
                await personController.getDetails()
                let result = await models.ScheduledCemeteryService.scope(
                    'intermentInformationSectionScope',
                    'intermentRequestSectionScope',
                    'merchandiseAdditionalInfoSectionScope',
                    'genericSectionScope',
                    'FuneralArrangementSectionScope',
                    'disintermentInfoSectionScope',
                    'casketSectionScope',
                    'vaultSectionScope',
                    'urnInformationScope',
                    'personScope',
                    (!isMiscSales) ? 'itemUsageScope' : 'miscServiceItemScope',
                    'noteSectionsScope',
                    'schedulingFileScope')
                    .findOne({
                        where: { personId, id: scsId },
                        attributes: ['id', 'itemUsageId', 'agreementLocationItemId'],
                        transaction
                    })
                if (result) {
                    result = result.toJSON()
                    if (result.intermentInformationDetails) {
                        result.intermentInformationDetails['propertyDetails'] = null
                        if (result.intermentInformationDetails) {
                            if (result.intermentInformationDetails.temporaryBurialLocationId) {
                                result.intermentInformationDetails.temporaryBurialLocation = await this.getTempPropertyDataFromHMIS(result.intermentInformationDetails.temporaryBurialLocationId)
                            } else {
                                result.intermentInformationDetails['temporaryBurialLocation'] = null
                            }
                            if (result.intermentInformationDetails.temporaryDisintermentLocationId) {
                                result.intermentInformationDetails.temporaryDisintermentLocation = await this.getTempPropertyDataFromHMIS(result.intermentInformationDetails.temporaryDisintermentLocationId)
                            } else {
                                result.intermentInformationDetails['temporaryDisintermentLocation'] = null
                            }
                            if (result.intermentInformationDetails.properties.length) {
                                let reqData = result.intermentInformationDetails.properties
                                if (reqData && reqData.length) {
                                    result.intermentInformationDetails.propertyDetails = reqData.map(e => {
                                        return {
                                            itemUsageId: e.propertyId,
                                            propertyId: e.itemUsage.agreementProperties.property.id,
                                            propertyName: e.itemUsage.agreementProperties.property.name,
                                            lotSellUnitId: e.itemUsage.agreementProperties.property.lotSellUnitId,
                                            lotSpaceId: e.itemUsage.lotSpaceId
                                        }
                                    })
                                }
                                delete result.intermentInformationDetails.properties
                            }
                        }
                    }
                    if (result.disintermentInformationDetails) {
                        result.disintermentInformationDetails['propertyDetails'] = null
                        if (result.disintermentInformationDetails && result.disintermentInformationDetails.properties.length) {
                            let reqData = result.disintermentInformationDetails.properties
                            if (reqData && reqData.length) {
                                result.disintermentInformationDetails.propertyDetails = reqData.map(e => {
                                    return {
                                        itemUsageId: e.propertyId,
                                        propertyId: e.itemUsage.agreementProperties.property.id,
                                        propertyName: e.itemUsage.agreementProperties.property.name,
                                        lotSellUnitId: e.itemUsage.agreementProperties.property.lotSellUnitId,
                                        lotSpaceId: e.itemUsage.lotSpaceId
                                    }
                                })
                            }
                            delete result.disintermentInformationDetails.properties
                        }
                    }
                    if (result.notesSections) {
                        _getNoteSections(result.notesSections, result)
                        delete result.notesSections
                    }
                    getCasketDetailsSection(result)
                    getUrnDetailsSection(result)
                    if (result.vaultItemUsageDetails || result.vaultItemDetails) {
                        result.vaultDetails = result.vaultItemUsageDetails || result.vaultItemDetails
                        if (result.vaultItemUsageDetails) {
                            result.vaultDetails.vault = {}
                            result.vaultDetails.vault.id = result.vaultDetails.ItemUsage.id
                            result.vaultDetails.vault.vaultName = result.vaultDetails.ItemUsage.agreementItems.locationItem.Item.name
                            delete result.vaultDetails.ItemUsage
                        } else {
                            if (!result.vaultDetails.vault) {
                                result.vaultDetails.vault = {}
                            }
                            result.vaultDetails.vault.vaultName = _.get(result, 'vaultDetails.vault.locationItem.Item.name')
                            if (result.vaultDetails.vault) {
                                delete result.vaultDetails.vault.locationItem
                            }
                        }
                        result.vaultDetails.vault.resourceType = result.vaultDetails.resourceType
                        delete result.vaultDetails.resourceType
                    } else {
                        if (result.vaultDetails) {
                            result.vaultDetails.vault = null
                            delete result.vaultDetails.resourceType
                        } else {
                            result.vaultDetails = null
                        }
                    }
                    delete result.vaultItemUsageDetails
                    delete result.vaultItemDetails
                    if (result.person && result.person.personVerificationDetails) {
                        result.person.onePortalId = result.person.personVerificationDetails.onePortalId
                        delete result.person.personVerificationDetails
                    }
                    if (result.itemUsage) {
                        result.serviceName = _.get(result.itemUsage, 'agreementItems.locationItem.Item.itemAttributes[0].AttributeValue.name')
                        result.contractNumber = _.get(result.itemUsage, 'agreementItems.agreementDetails.contractNumber')
                        result.agreementType = _.get(result.itemUsage, 'agreementItems.agreementDetails.type')
                        result.addendumNumber = _.get(result.itemUsage, 'agreementItems.addendumDetails') ? _.get(result.itemUsage, 'agreementItems.addendumDetails.addendumNumber') : null
                        delete result.itemUsage
                    }
                    if (result.agreementLocationItem) {
                        result.serviceName = _.get(result.agreementLocationItem, 'locationItem.Item.itemAttributes[0].AttributeValue.name')
                        result.contractNumber = _.get(result.agreementLocationItem, 'agreementDetails.contractNumber')
                        result.agreementType = _.get(result.agreementLocationItem, 'agreementDetails.type')
                        result.addendumNumber = _.get(result.agreementLocationItem, 'addendumDetails') ? _.get(result.itemUsage, 'agreementItems.addendumDetails.addendumNumber') : null
                        delete result.agreementLocationItem
                    }
                    return result
                } else {
                    throw new Error('SCHEDULABLE_CEMETERY_SERVICE_NOT_FOUND')
                }
            } else {
                throw new Error('PERSONID_AND_SCHEDULEDCEMETERYSERVICEID_ARE_REQUIRED')
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * user story: ccs-7635 and ccs-7638
     * Create/update scheduled cemetery service
     * @param {*} reqData
     * @param {integer} reqData.id
     * @param {integer} reqData.itemUsageId
     * @param {integer} reqData.intermentInformationDetails.id
     * @param {integer} reqData.intermentInformationDetails.propertyId
     * @param {date} reqData.intermentInformationDetails.beginningTime
     * @param {date} reqData.intermentInformationDetails.endingTime
     * @param {integer} reqData.intermentInformationDetails.temporaryBurialLocationId implemented as part of 7485
     * @param {integer} reqData.intermentInformationDetails.temporaryDisintermentLocationId implemented as part of 7485
     * @param {string} reqData.intermentInformationDetails.memorialInformation
     * @param {boolean} reqData.intermentInformationDetails.isPreburied
     * @param {integer} reqData.intermentRequestDetails.id
     * @param {boolean} reqData.intermentRequestDetails.isWitnessLoweringOrEntombment
     * @param {boolean} reqData.intermentRequestDetails.isWitnessCoveringOrSealings
     * @param {boolean} reqData.intermentRequestDetails.isWitnessFilling
     * @param {boolean} reqData.intermentRequestDetails.isReopenBottom
     * @param {boolean} reqData.intermentRequestDetails.isBurningPot
     * @param {boolean} reqData.intermentRequestDetails.isMoundOfDirtByFootend
     * @param {boolean} reqData.intermentRequestDetails.isUseOfTent
     * @param {boolean} reqData.intermentRequestDetails.isPlaceAndNotify
     * @param {boolean} reqData.intermentRequestDetails.isReopenTop
     * @param {integer} reqData.disintermentInformationDetails.id
     * @param {integer} reqData.disintermentInformationDetails.propertyId for now null
     * @param {date} reqData.disintermentInformationDetails.beginningTime
     * @param {date} reqData.disintermentInformationDetails.endingTime
     * @param {string} reqData.disintermentInformationDetails.disintermentReason
     * @param {string} reqData.disintermentInformationDetails.disintermentType values 'fullbody', 'crematedremains'
     * @param {string} reqData.disintermentInformationDetails.instruction
     * @param {array} reqData.notesFromFamily
     * @param {string} reqData.notesFromFamily.content
     * @param {array} reqData.notesFromStaff
     * @param {string} reqData.notesFromStaff.content
     * @param {integer} reqData.casketDetails.id
     * @param {integer} reqData.casketDetails.isOutSideCasket
     * @param {string} reqData.casketDetails.resourceType
     * @param {integer} reqData.casketDetails.casketId
     * @param {string} reqData.casketDetails.casketType
     * @param {integer} reqData.vaultDetails.id
     * @param {boolean} reqData.vaultDetails.isVaultFromDisinterment
     * @param {string} reqData.vaultDetails.resourceType
     * @param {integer} reqData.vaultDetails.vaultId
     * @param {string} reqData.vaultDetails.disinteredVaultDetails
     * @param {integer} reqData.merchandiseAdditionalInfoDetails.id
     * @param {boolean} reqData.merchandiseAdditionalInfoDetails.isVasesSelected
     * @param {integer} reqData.merchandiseAdditionalInfoDetails.noOfVases
     * @param {string} reqData.merchandiseAdditionalInfoDetails.instruction
     * @param {integer} reqData.urnInformationDetails.id
     * @param {boolean} reqData.urnInformationDetails.isFamilyOwnedUrn
     * @param {integer} reqData.urnInformationDetails.resourceType
     * @param {integer} reqData.urnInformationDetails.urnId
     * @param {string} reqData.urnInformationDetails.height
     * @param {string} reqData.urnInformationDetails.width
     * @param {string} reqData.urnInformationDetails.depth
     * @param {integer} reqData.urnInformationDetails.urnType
     * @param {string} reqData.urnInformationDetails.urnStatus
     * @param {date} reqData.urnInformationDetails.receivedDate
     * @param {boolean} reqData.urnInformationDetails.isTransferRequired
     * @param {integer} reqData.genericDetails.id
     * @param {boolean} reqData.genericDetails.isLocationVerifiedWithFamily
     * @param {boolean} reqData.genericDetails.isLocationVerifiedWithPlattedRecord
     * @param {boolean} reqData.genericDetails.isElectronicCIF
     * @param {boolean} reqData.genericDetails.reviewedTrustStatement
     * @param {boolean} reqData.genericDetails.confirmedExpectedMerchandiseDelivery
     * @param {boolean} reqData.genericDetails.confirmedPlacementScheduleWithFuneralDirector
     * @param {boolean} reqData.genericDetails.isPermitted
     * @param {boolean} reqData.genericDetails.isWitnessedCremation
     * @param {integer} reqData.genericDetails.noOfWitness
     * @param {string} reqData.genericDetails.instruction
     * @param {integer} reqData.funeralArrangementDetails.id
     * @param {integer} reqData.funeralArrangementDetails.clFacilityLocationId
     * @param {integer} reqData.funeralArrangementDetails.serviceLocationId
     * @param {string} reqData.funeralArrangementDetails.funeralHomePhone
     * @param {string} reqData.funeralArrangementDetails.phone
     * @param {integer} reqData.funeralArrangementDetails.funeralDirectorId
     * @param {string} reqData.funeralArrangementDetails.instruction
     * @param {array} reqData.funeralArrangementDetails.funeralArrangementSectionLocations
     * @param {string} reqData.funeralArrangementDetails.funeralArrangementSectionLocations.type values for type is 'viewing', 'visitation1', 'visitation2', 'visitation3', 'reception'
     * @param {string} reqData.funeralArrangementDetails.funeralArrangementSectionLocations.location
     * @param {date} reqData.funeralArrangementDetails.funeralArrangementSectionLocations.startTime
     * @param {date} reqData.funeralArrangementDetails.funeralArrangementSectionLocations.endTime
     */

    async createOrUpdateScheduledCemeteryService (reqData) {
        try {
            let serviceWhereCond = {
                personId: reqData.personId,
                itemUsageId: reqData.itemUsageId,
                deletedAt: null,
                deletedBy: null
            }

            if (reqData.isMiscSalesService) {
                delete serviceWhereCond.itemUsageId
                serviceWhereCond.agreementLocationItemId = reqData.agreementLocationItemId
            }
            // To check Scheduled Cemetery service already created
            const cemeteryService = await models.ScheduledCemeteryService.findOne({ where: serviceWhereCond })
            if (!reqData.id && cemeteryService && !reqData.isMiscSalesService) {
                throw new Error('Scheduled Cemetery service already created. Please refresh')
            }
            // TODO: fetch work order to check whether status of work order is in closed status or not -- Venu
            let workOrder
            if (reqData.id) {
                workOrder = await models.WorkOrder.scope('notDeleted', 'withStatus').findOne({
                    where: {
                        resourceType: 'ScheduledCemeteryService',
                        resourceId: reqData.id
                    }
                })
            }
            logger.info(`Create/update Cemetery scheudling checking for work order status`)
            if (_.get(workOrder, 'status.name') !== 'closed') {
                const personController = new PersonController(reqData.personId)
                await personController.getDetails()
                let itemUsageController = new ItemUsageController(reqData.personId)
                if (!reqData.isMiscSalesService) {
                    await itemUsageController.findItemUsage(reqData.itemUsageId)
                }
                logger.info(`Create/update Cemetery scheudling checking for work order status and status is not closed`)
                const result = await models.sequelize.transaction(async (transaction) => {
                    let intermentInformationSectionId, disintermentInfoSectionId, intermentRequestSectionId, vaultSectionId, casketSectionId, urnInformationSectionId, merchandiseAdditionalInfoSectionId, genericSectionId, funeralArrangementSectionId
                    if (reqData.intermentInformationDetails && reqData.intermentInformationDetails.beginningTime && reqData.intermentInformationDetails.endingTime) {
                        if (!_.isEmpty(reqData.disintermentInformationDetails)) {
                            reqData.disintermentInformationDetails.beginningTime = null
                            reqData.disintermentInformationDetails.endingTime = null
                        }
                    }
                    if (reqData.disintermentInformationDetails && reqData.disintermentInformationDetails.beginningTime && reqData.disintermentInformationDetails.endingTime) {
                        if (!_.isEmpty(reqData.intermentInformationDetails)) {
                            reqData.intermentInformationDetails.beginningTime = null
                            reqData.intermentInformationDetails.endingTime = null
                        }
                    }

                    if (!_.isEmpty(reqData.intermentInformationDetails)) {
                        const intermentInfoSectionInstance = new IntermentInfoSectionController()
                        const createdIntermentSchedulingRecord = await intermentInfoSectionInstance.upsertIntermentSection(reqData.intermentInformationDetails, reqData.id, reqData.userId, transaction, reqData.fromWO)
                        intermentInformationSectionId = createdIntermentSchedulingRecord.id
                    }
                    if (!_.isEmpty(reqData.intermentRequestDetails)) {
                        const intermentRequestSectionInstance = new IntermentRequestSectionController()
                        const interementRequestInfoRecord = await intermentRequestSectionInstance.upsertIntermentRequestSection(reqData.intermentRequestDetails, transaction)
                        intermentRequestSectionId = interementRequestInfoRecord.id
                    }
                    if (!_.isEmpty(reqData.disintermentInformationDetails)) {
                        const disintermentInfoSectionInstance = new DisintermentInfoSectionController()
                        const disintermentCreated = await disintermentInfoSectionInstance.upsertDisintermentSection(reqData.disintermentInformationDetails, reqData.id, reqData.userId, transaction, reqData.fromWO)
                        disintermentInfoSectionId = disintermentCreated.id
                    }
                    if (!_.isEmpty(reqData.casketDetails)) {
                        const casketSectionInstance = new CasketSectionController()
                        const createdCasketeRecord = await casketSectionInstance.upsertCasketSection(reqData.casketDetails, transaction, reqData.userId, 'Cemetery')
                        casketSectionId = createdCasketeRecord.id
                    }
                    if (!_.isEmpty(reqData.urnInformationDetails)) {
                        const urnInfoInstance = new UrnInfoSectionController()
                        const createdUrnInfoRecord = await urnInfoInstance.upsertUrnInfoSection(reqData.urnInformationDetails, transaction, reqData.userId, 'Cemetery')
                        urnInformationSectionId = createdUrnInfoRecord.id
                    }
                    if (!_.isEmpty(reqData.vaultDetails)) {
                        const vaultInstance = new VaultSectionController()
                        const createdVault = await vaultInstance.upsertVaultSection(reqData.vaultDetails, transaction, reqData.userId, 'Cemetery')
                        vaultSectionId = createdVault.id
                    }
                    if (!_.isEmpty(reqData.merchandiseAdditionalInfoDetails)) {
                        const merchandiseInfoInstance = new MerchandiseInfoSectionController()
                        const createdMerchandiseResult = await merchandiseInfoInstance.upsertMerchandiseInfoSection(reqData.merchandiseAdditionalInfoDetails, transaction)
                        merchandiseAdditionalInfoSectionId = createdMerchandiseResult.id
                    }
                    if (!_.isEmpty(reqData.genericDetails)) {
                        const genericInfoInstance = new GenericSectionController()
                        const createdGenericSection = await genericInfoInstance.upsertGenericSection(reqData.genericDetails, transaction)
                        genericSectionId = createdGenericSection.id
                    }
                    if (!_.isEmpty(reqData.funeralArrangementDetails)) {
                        const funeralArrangementInfoInstance = new FuneralArrangementSectionController()
                        const createdFuneralArrangement = await funeralArrangementInfoInstance.upsertFuneralArrangementInfoSection(reqData.funeralArrangementDetails, transaction)
                        funeralArrangementSectionId = createdFuneralArrangement.id
                    }
                    let inputObj = {
                        id: reqData.id,
                        personId: reqData.personId,
                        itemUsageId: reqData.itemUsageId,
                        agreementLocationItemId: reqData.agreementLocationItemId,
                        intermentInformationSectionId,
                        intermentRequestSectionId,
                        disintermentInfoSectionId,
                        vaultSectionId,
                        casketSectionId,
                        urnInformationSectionId,
                        merchandiseAdditionalInfoSectionId,
                        genericSectionId,
                        funeralArrangementSectionId
                    }
                    const createdResult = await upsert('ScheduledCemeteryService', inputObj, transaction, { userId: reqData.userId })
                    if (!_.isEmpty(reqData.notesFromFamily)) {
                        await _createNoteForResourceSection(reqData.notesFromFamily, createdResult.id, reqData.userId, 'family', transaction)
                    }
                    if (!_.isEmpty(reqData.notesFromStaff)) {
                        await _createNoteForResourceSection(reqData.notesFromStaff, createdResult.id, reqData.userId, 'staff', transaction)
                    }
                    if (!_.isEmpty(reqData.schedulingFile) && createdResult) {
                        reqData.schedulingFile.schedulingType = 'cemetery'
                        reqData.schedulingFile.schedulingId = createdResult.id
                        const schedulingFileController = new SchedulingFileController()
                        await schedulingFileController.upsertSchedulingFileSection(reqData.schedulingFile, transaction)
                    }
                    logger.info(`Create/update Cemetery scheduling, if create scheduling, creating work order`)
                    // TODO: Create cemetery work order -- Venu
                    if (createdResult) {
                        // Creating urnTransfer entry
                        if (!_.isEmpty(reqData.urnInformationDetails)) {
                            const UrnTransferInstance = new UrnTransferController()
                            let urnTransferPayload = { ...reqData, id: createdResult.id }
                            await UrnTransferInstance.upsertUrnTransferDetails(urnTransferPayload, 'ScheduledCemeteryService', transaction)
                        }
                        // call create work order function
                        const woPayload = {
                            resourceType: 'ScheduledCemeteryService',
                            resourceId: createdResult.id
                        }

                        if (!inputObj.id) {
                            await WorkOrderController.createWorkOrder(woPayload, reqData.userId, transaction)
                            logger.info(`Create/update scheduling, work order creation done`)
                        } else {
                            if (!_.isEmpty(workOrder)) {
                                const workOrderScheduleDetails = await this.getScheduledCemeteryServiceDetails(reqData.personId, createdResult.id, transaction, reqData.isMiscSalesService)
                                // to remove all resources of workorder and set to  unassigned state
                                if (!_.isEmpty(reqData.disintermentInformationDetails)) {
                                    if (workOrderScheduleDetails.disintermentInformationDetails.beginningTime !== reqData.disintermentInformationDetails.beginningTime || workOrderScheduleDetails.disintermentInformationDetails.endingTime !== reqData.disintermentInformationDetails.endingTime) {
                                        await WorkOrderController.removeWorkOrderScheduleAndResources(createdResult.id, 'ScheduledCemeteryService', reqData.userId, transaction, true, reqData.fromWO)

                                        // Triggering Email notification if there is a change in Date and time
                                        if (workOrder.statusId === 2) {
                                            await this.scheduleServiceDateUpdateEmailNotification(reqData, 'Cemetery', transaction)
                                        }
                                    }
                                }
                                if (!_.isEmpty(reqData.intermentInformationDetails)) {
                                    if (workOrderScheduleDetails.intermentInformationDetails.beginningTime !== reqData.intermentInformationDetails.beginningTime || workOrderScheduleDetails.intermentInformationDetails.endingTime !== reqData.intermentInformationDetails.endingTime) {
                                        await WorkOrderController.removeWorkOrderScheduleAndResources(createdResult.id, 'ScheduledCemeteryService', reqData.userId, transaction, true, reqData.fromWO)

                                        // Triggering Email notification if there is a change in Date and time
                                        if (workOrder.statusId === 2) {
                                            await this.scheduleServiceDateUpdateEmailNotification(reqData, 'Cemetery', transaction)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    return createdResult
                })
                // adding webcem job into queue
                const { queueNames, queues } = require('../../../appQueues')
                const webCemQueue = queues[queueNames.webCemQueue]
                const dataToSend = {
                    event: 'decedent.save',
                    payload: {
                        personId: reqData.personId,
                        userId: reqData.userId
                    }
                }
                webCemQueue.add('webCemQueue', dataToSend)
                if (result) {
                    const scs = await this.getScheduledCemeteryServiceDetails(reqData.personId, result.id, null, reqData.isMiscSalesService)

                    /**
                     * Syncing scheduling details to FAA
                     */
                    // const cremationController = new CremationSyncController(reqData.personId)
                    // await cremationController.updateCremationServices()
                    faaWorker.addQueue({ personId: reqData.personId, faaWorker_event: 'syncCremationData' })
                    return scs
                } else {
                    logger.error('Error while creating scheduledFuneralService')
                    throw new Error('SCHEDULING_CREATION_FAILED')
                }
            } else {
                logger.error(`Create/update Cemetery scheudling, respective work order status is closed`)
                throw new Error('THIS_CEMETERY_SCHEDULE_CAN_NOT_BE_EDITITED_BECAUSE_RELATED_WORK_ORDER_IS_CLOSED')
            }
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    /**
     * This method deletes the Scheduled Cemetery Services
     * @param {*} itemUsageId is the id of the ItemUsage
     * @param {*} userId is the id of user logged in
     * @param {string} timezone
     * @param {*} transaction
     */
    static async deleteScheduledCemeteryServices (itemUsageId, userId, timezone, transaction) {
        // Fetches scheduled cemetery service
        let scs = await models.ScheduledCemeteryService.findOne({
            where: {
                itemUsageId: itemUsageId,
                deletedAt: null,
                deletedBy: null
            },
            transaction
        })
        if (scs) {
            // Soft delete scheduled cemetery service
            await WorkOrderController.deleteWorkOrder(scs.id, 'ScheduledCemeteryService', userId, timezone, transaction)
            let res = await models.ScheduledCemeteryService.update({
                deletedAt: new Date(),
                deletedBy: userId
            }, {
                where: { itemUsageId: itemUsageId },
                transaction
            })
            // TODO: Deleting related WO and PO by Venu

            // Deleting the corresponding urnTransferDetails
            const UrnTransferInstance = new UrnTransferController()
            await UrnTransferInstance.deleteUrnTransfer(
                scs.id,
                'ScheduledCemeteryService',
                userId,
                transaction
            )
            return res
        }
    }

    static async getTemporaryProperties () {
        let temporaryPropertiesFromHMIS = []
        temporaryPropertiesFromHMIS = await hmisDB.sequelize.query(`select Lot_Sell_Unit_ID, Location, LSU_Status_Cd from Lot_Sell_Unit WHERE LSU_Status_Cd IN ('TI','TB')`, {
            type: hmisDB.sequelize.QueryTypes.SELECT
        })
        let finalResult = {}
        if (temporaryPropertiesFromHMIS && temporaryPropertiesFromHMIS.length) {
            temporaryPropertiesFromHMIS = temporaryPropertiesFromHMIS.map(tempProperty => {
                tempProperty.LSU_Status_Cd = tempProperty.LSU_Status_Cd.trim()
                return tempProperty
            })
            finalResult.temporaryBurialProperties = temporaryPropertiesFromHMIS.filter(tbProperty => tbProperty.LSU_Status_Cd === 'TB')
            finalResult.temporaryDisintermentProperties = temporaryPropertiesFromHMIS.filter(tbProperty => tbProperty.LSU_Status_Cd === 'TI')
        }
        return finalResult
    }

    async getTempPropertyDataFromHMIS (LotSellUnitId) {
        const temporaryBurialPropertyFromHMIS = await hmisDB.sequelize.query(`select Lot_Sell_Unit_ID, Location, LSU_Status_Cd from Lot_Sell_Unit WHERE Lot_Sell_Unit_ID=:LotSellUnitId`, {
            type: hmisDB.sequelize.QueryTypes.SELECT,
            replacements: {
                LotSellUnitId
            }
        })
        let result = null
        if (temporaryBurialPropertyFromHMIS.length) {
            // eslint-disable-next-line no-const-assign
            [result] = temporaryBurialPropertyFromHMIS
        }
        return result
    }

    /**
   * Method which sends notification when changes are made to a date/time of a scheduled service
   * @param {object} data
   * @param {string} type
   * @param {*} transaction
   */
    async scheduleServiceDateUpdateEmailNotification (data, type, transaction) {
        try {
            const { queueNames, queues } = require('../../../appQueues')
            const scheduleServiceDateUpdateEmailWorker = queues[queueNames.email_queue]

            let workOrderScheduleDetails
            if (type === 'Funeral') {
                workOrderScheduleDetails = await this.getScheduledFuneralServiceDetails(data.personId, data.id, transaction)
            } else {
                workOrderScheduleDetails = await this.getScheduledCemeteryServiceDetails(data.personId, data.id, transaction, data.isMiscSalesService)
            }

            const emailObj = {
                name: returnFullName(_.get(workOrderScheduleDetails, 'person')),
                opi: _.get(workOrderScheduleDetails, 'person.onePortalId'),
                serviceName: _.get(workOrderScheduleDetails, 'serviceName')
            }
            scheduleServiceDateUpdateEmailWorker.add('ScheduleServiceDateUpdateEmail', emailObj)
        } catch (error) {
            throw error
        }
    }

    /**
     * Fetches the Miscellaneous Sales Details of a person
     * @param {*} personId is the id of the person
     */
    async getMiscSalesDetails (personId) {
        const AgmtCtrl = require('../agreementController/agreementController')
        let result = await models.Person.findOne({
            where: { id: personId },
            attributes: ['isAlive'],
            include: [
                {
                    model: models.AgreementPerson,
                    as: 'agreementPersons',
                    include: [
                        {
                            model: models.AgreementRole,
                            as: 'agreementRole'
                        },
                        {
                            model: models.Agreement,
                            where: { type: AgmtCtrl.TYPES['Miscellaneous Sales'] }
                        }
                    ],
                    required: false
                }
            ]
        })
        let res = {
            isAlive: result.isAlive,
            miscSalesInformation: null
        }
        if (result.agreementPersons.length) {
            res.miscSalesInformation = []
            result.agreementPersons.forEach(e => {
                res.miscSalesInformation.push({
                    agreementId: e.Agreement.id,
                    role: e.agreementRole.name
                })
            })
        }
        return res
    }
    async getCommaSeperatedValues (values, attribute) {
        var result = values ? values.reduce((unique, o) => {
            if (!unique.some(obj => obj.lotSpaceId === o.lotSpaceId)) {
                unique.push(o)
            }
            return unique
        }, []) : ''
        const assignedNames = result ? result.reduce((acc, val, index) => {
            const seperator = index < result.length - 1 ? ',  ' : ''
            return acc + val[attribute] + ` (${val['lotSpaceId']})` + seperator
        }, '') : ''
        return assignedNames
    };
    async temporialBurialReport (queryObj, exp) {
        const ItemUsageController = require('../itemUsageController/itemUsageController')
        let listQuery = await this.queryObjForTemporialBurial(queryObj)
        if (exp) queryObj.page = 1
        const offset = (queryObj.page - 1) * queryObj.limit
        const sortOrder = queryObj.sortOrder || 'desc'
        const orderByQuery = `ORDER BY [scs].[updatedAt] ${sortOrder}`
        let query = `select 
        (
            select IIF(addendum.id > 0 ,addendum.id, a.id) as id, IIF(addendum.id > 0 ,addendum.addendumNumber,a.contractNumber) as contractNumber,  IIF(addendum.id > 0 ,addendum.status, a.status) as status FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ) as contract,
        (
            select arr.id as id, arr.name as name FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ) as arranger,
        (
            select person.id as id, person.firstName as firstName, person.lastName as lastName, person.middleName as middleName, person.isAlive as isAlive, pvd.onePortalId as onePortalId
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ) as decedent,
        (
            select scs.id as scheduledId, iis.temporaryBurialLocationId as tempBurialLocationId, iis.beginningTime as burialDate FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ) as burialInformation
        FROM Agreement a 
        INNER JOIN Employee arr ON arr.id = a.arrangerId
        LEFT JOIN AgreementLocationItem as ali ON ali.agreementId = a.id
        LEFT JOIN Addendum addendum ON addendum.agreementId = a.id AND ali.addendumId = addendum.id
        LEFT JOIN ItemUsage as iu ON iu.resourceId = ali.id
        LEFT JOIN ScheduledCemeteryService as scs ON scs.itemUsageId = iu.id
        LEFT JOIN Person as person ON person.id = scs.personId
        LEFT JOIN PersonVerificationDetails pvd ON pvd.personId = person.id
        LEFT JOIN IntermentInformationSection iis ON scs.intermentInformationSectionId=iis.id
        LEFT JOIN CemeteryScheduledProperty csp ON csp.intermentInfoSectionId = iis.id
        where iis.temporaryBurialLocationId IS NOT NULL AND iu.deletedAt IS NULL ${listQuery}`
        if (queryObj.page) query += ` ${orderByQuery} OFFSET ${offset} ROWS FETCH NEXT ${queryObj.limit} ROWS ONLY`
        const list = await models.sequelize.query(query, {
            type: models.sequelize.QueryTypes.SELECT
        })
        list.map(e => convertToJson(e))
        await Promise.all(list.map(async lis => {
            const tempProperties = await this.getTempPropertyDataFromHMIS(lis.burialInformation.tempBurialLocationId)
            lis.burialInformation.temporaryBurialLocation = tempProperties.Location
            let itemUsageController = new ItemUsageController(lis.decedent.id)
            const { selectedProperties } = await itemUsageController.getConsumedProperties(lis.decedent.id, 'Cemetery Graveside Service')
            if (selectedProperties.length) {
                lis.burialInformation.purchasedBurialLocation = await this.getCommaSeperatedValues(selectedProperties, 'propertyName')
            }
        }))
        return list
    }
    async queryObjForTemporialBurial (queryObj) {
        let sql = ''
        Object.keys(queryObj).map((e) => {
            switch (e) {
            case 'scheduledId':
                sql += ` AND [scs].[id] IN (select value from STRING_SPLIT('${queryObj.scheduledId}', ','))`
                break
            case 'contractNumber':
                sql += ` AND [a].[contractNumber] LIKE '%${queryObj.contractNumber}%'`
                break
            case 'decedent':
                let words = '\'' + queryObj.decedent.split(' ').join('\',\'') + '\''
                sql += ` AND (person.firstName LIKE '%${queryObj.decedent}%' OR person.middleName LIKE '%${queryObj.decedent}%' OR person.lastName LIKE '%${queryObj.decedent}%' OR person.firstName IN (${words}) OR person.middleName IN (${words}) OR person.lastName IN (${words})) `
                break
            case 'arrangerId':
                sql += ` AND [arr].[id] = ${queryObj.arrangerId}`
                break
            case 'status':
                sql += `  AND (IIF (addendum.id > 0 ,[addendum].[status],[a].[status]) = '${queryObj.status}')`
                break
            default:
                break
            }
        })
        if (queryObj.burialDateFrom && queryObj.burialDateTo) {
            let startDate = moment.utc(moment(queryObj.burialDateFrom).tz(queryObj.timezone).startOf('day')).format('YYYY/MM/DD HH:mm')
            let endDate = moment.utc(moment(queryObj.burialDateTo).tz(queryObj.timezone).endOf('day')).format('YYYY/MM/DD HH:mm')
            sql += ` AND iis.beginningTime between '${startDate}' AND '${endDate}'`
        }
        return sql
    }
}

module.exports = exports = SchedulingController
