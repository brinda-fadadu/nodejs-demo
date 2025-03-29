const logger = require('../../../lib/logger')
const { seed } = require('../../../config/seed')
const { getKey } = require('../../../lib/util')
const models = require('../../../models')
const Op = require('sequelize').Op
const _ = require('underscore')
const lodash = require('lodash')
const PersonController = require('./../personController/personController')
const PurchaseOrderController = require('../purchaseOrderController/purchaseOrderController')
const intermentInfoSectionController = require('../schedulingController/intermentInfoSectionController')
const env = process.env.NODE_ENV || 'development'
const config = require('./../../../config/hmis-config')
const hmisDB = config[env].database
const hmisDBHost = config[env].host

const { agreementItemIncludeObj, itemUsageStatusIncludeObj, personDetailsIncludeObj, agreementMemorialItemIncludesObj, checkItemUsedOrSelect } = require('./itemUsageCommonInclude')

const getCemetryTypes = {
    Properties: 0,
    Merchandises: 1,
    Services: 2,
    Memorial: 3,
    addOns: 4
}
const finalSummary = {
    0: 'agreementPropertiesRights',
    1: 'agreementMerchandise',
    2: 'agreementServices',
    3: 'agreementMemorial',
    4: 'addOns'
}
const itemUsageResourceType = {
    Properties: 'AgreementProperty',
    Merchandises: 'AgreementLocationItem',
    Services: 'AgreementLocationItem',
    Memorial: 'AgreementMemorialItem',
    addOns: 'AgreementLocationItem'
}
const MerchandisesSection = {
    CasketSection: 'casketId',
    UrnInformationSection: 'urnId',
    VaultSection: 'vaultId'
}
const merchandiseSchedulingObject = {
    CasketSection: 'casketSectionId',
    UrnInformationSection: 'urnInformationSectionId',
    VaultSection: 'vaultSectionId'
}
class ItemUsageController {
    constructor (personId) {
        this.personId = personId
    }
    async findItemUsage (itemUsageId) {
        const condition = {
            id: itemUsageId
        }
        if (this.personId) {
            condition['personId'] = this.personId
        }
        const itemUsage = await models.ItemUsage.findOne({ where: condition })
        if (!itemUsage) {
            throw new Error('ITEM_USAGE_NOT_FOUND')
        }
    }
    /**
     * to check agreement location item id is available not
     * @param {Number} id is agreementLocationItem id
     */
    async findAgreementLocationItems (id) {
        const agreementLocation = await models.AgreementLocationItem.findOne({ where: { id } })
        if (!agreementLocation) {
            throw new Error('AGREEMENT_LOCATION_ITEM_NOT_FOUND')
        }
    }
    async findAgreementPropertyItems (id) {
        const agreementLocation = await models.AgreementProperty.findOne({ where: { id } })
        if (!agreementLocation) {
            throw new Error('AGREEMENT_PROPERTY_ITEM_NOT_FOUND')
        }
    }
    /**
     * to check agreement memorial item id is available not
     * @param {Number} ids is agreementMemorialItem ids
     */
    async findAgreementMemorialItems (ids) {
        const agreementLocation = await models.AgreementMemorialItem.findAll({ where: { id: { [Op.in]: ids } } })
        if (!agreementLocation || ids.length !== agreementLocation.length) {
            throw new Error('AGREEMENT_MEMORIAL_ITEM_NOT_FOUND')
        }
    }
    /**
     * user story: ccs-6899
     * get counts itemsUsage
     */
    async getItemUsageSummary () {
        try {
            const personController = new PersonController(this.personId)
            await personController.getDetails()
            let itemUsageType = {
                agreementPropertiesRights: 0,
                agreementMerchandise: 0,
                agreementServices: 0,
                agreementMemorial: 0
            }
            let cemetryCount = []
            let cemetryItemsArray = []
            let itemUsageArray = []
            // cemetry item selections
            for (let type of Object.keys(getCemetryTypes)) {
                if (['Merchandises', 'Services', 'addOns'].includes(type)) {
                    cemetryItemsArray.push(
                        await this.getCemetryItemsMerchandiseAndServices(type)
                    )
                } else if (['Memorial'].includes(type)) {
                    cemetryItemsArray.push(
                        await this.getCemetryItemsMemorials([type])
                    )
                } else {
                    // cemetryItemsArray.push({ count: 0, ids: {} })
                    cemetryItemsArray.push(await this.getCemeteryItemProperties())
                }
            }
            // set cemetrycounts object to counts and ids
            cemetryCount = cemetryItemsArray.map((ele, i) => {
                if ([1, 2, 4].includes(i) && ele) {
                    return this._getCemetryItemsCount(ele)
                } else if ([3].includes(i) && ele) {
                    return this._getCemetryItemsCount(ele, 'Memorial')
                } else if ([0].includes(i) && ele) {
                    return this._getCemetryItemsCount(ele, 'Properties')
                } else {
                    return { count: 0, ids: {} }
                }
            })
            // get items selected or used
            for (let type of Object.keys(getCemetryTypes)) {
                if (cemetryCount[getCemetryTypes[type]] &&
                    Object.keys(cemetryCount[getCemetryTypes[type]].ids).length) {
                    itemUsageArray.push(
                        await this.getItemUsageItems(
                            Object.keys(cemetryCount[getCemetryTypes[type]].ids),
                            itemUsageResourceType[type], 'resourceId', false)
                    )
                } else {
                    itemUsageArray.push([])
                }
                // else {
                //     itemUsageArray.push(
                //         await this.getItemUsageItems(
                //             Object.keys(cemetryCount[getCemetryTypes[type]].ids),
                //             itemUsageResourceType[type], 'resourceId', false, Object.values(cemetryCount[getCemetryTypes[type]].ids)
                //         )
                //     )
                // }
            }
            // remove used items count from cemetrycounts
            if (itemUsageArray.length) {
                itemUsageArray.map((itemUsage, index) => {
                    if (itemUsage.length) {
                        return this._getItemUsageCount(
                            itemUsage,
                            index,
                            cemetryCount
                        )
                    }
                })
            }
            this._setItemUsageSummary(cemetryCount, itemUsageType)
            return itemUsageType
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    /**
     * user story: ccs-6874, ccs-6916
     * Fetch items for item usage listing
     * @param {*} queryParams includes filter(values are 'properties', 'Merchandises', 'Services', 'Memorials'), page, limit
     */
    async getAvailableItemsForItemUsage (queryParams) {
        try {
            const personController = new PersonController(this.personId)
            await personController.getDetails()
            if (queryParams && queryParams.filter) {
                const page = queryParams.page ? queryParams.page : 1 // default 1
                const limit = queryParams.limit ? queryParams.limit : 10 // default 10
                let result
                // Fetching merchandise and services
                if (['Merchandises', 'Services', 'addOns'].includes(queryParams.filter)) {
                    result = await this.getCemetryItemsMerchandiseAndServices(queryParams.filter)
                } else if (['Memorial'].includes(queryParams.filter)) {
                    result = await this.getCemetryItemsMemorials()
                } else if (['Properties'].includes(queryParams.filter)) {
                    result = await this.getCemeteryItemProperties()
                }

                let resultArray = []
                if (result) {
                    // Generating outcome
                    if (result.agreementPersons && result.agreementPersons.length) {
                        if (['Merchandises', 'Services', 'addOns'].includes(queryParams.filter)) {
                            result.agreementPersons.map(async (agPerson) => {
                                await agPerson.Agreement.agreementItems.map(agItem => {
                                    let agreementItems = {
                                        typeOfItem: agItem.addendumDetails ? 'addendum' : 'agreement',
                                        agreementLocationItemId: agItem.id,
                                        itemCode: agItem.locationItem.Item.code,
                                        itemName: agItem.locationItem.Item.name,
                                        itemPrice: agItem.agreementItemPrice.unitPrice + agItem.agreementItemPrice.unitTax,
                                        contractNumber: agPerson.Agreement.contractNumber,
                                        addendumNumber: agItem.addendumDetails ? agItem.addendumDetails.addendumNumber : null,
                                        itemConsumptionResult: null,
                                        agreementType: agPerson.Agreement.type,
                                        isSchedulable: agItem.locationItem.Item.itemAttributes.find(ia => ia.AttributeValue && ia.AttributeValue.attribute && ia.AttributeValue.attribute.name === 'Scheduling Service') !== undefined
                                    }
                                    // looping above generated out come with multiples of quantity
                                    resultArray.push(...this._getItemsWithMultipleOfQuantity(agreementItems, agItem.agreementItemPrice.quantity))
                                })
                            })
                        } else if (['Memorial'].includes(queryParams.filter)) {
                            result.agreementPersons.map(async (agPerson) => {
                                await agPerson.Agreement.agreementMemorials.map(agMemorial => {
                                    let memorialItemsArray = []
                                    agMemorial.agreementMemorialItems.map((agMemorialItem) => {
                                        let memorialItem = {
                                            agreementMemorialItemId: agMemorialItem.id,
                                            itemId: agMemorialItem.locationItem.Item.id,
                                            itemCode: agMemorialItem.locationItem.Item.code,
                                            name: agMemorialItem.locationItem.Item.name,
                                            description: agMemorialItem.locationItem.Item.description,
                                            price: agMemorialItem.agreementItemPrice.unitPrice,
                                            totalPrice: agMemorialItem.agreementItemPrice.totalPrice,
                                            itemCategoryName: agMemorialItem.locationItem.Item.ItemCategory.name,
                                            itemConsumptionResult: null
                                        }
                                        memorialItemsArray.push(...this._getItemsWithMultipleOfQuantity(memorialItem, agMemorialItem.agreementItemPrice.quantity))
                                    })
                                    resultArray.push({
                                        typeOfItem: agMemorial.addendum ? 'addendum' : 'agreement',
                                        contractNumber: agPerson.Agreement.contractNumber,
                                        addendumNumber: agMemorial.addendum ? agMemorial.addendum.addendumNumber : null,
                                        items: memorialItemsArray
                                    })
                                })
                            })
                        }
                    }

                    let fetchItemUsageItems
                    let finalResultArray = []
                    // fetching for item usage listing by giving agreementlocationitem ids
                    if (['Merchandises', 'Services', 'addOns'].includes(queryParams.filter)) {
                        fetchItemUsageItems = await this.getItemUsageItems(_.pluck(resultArray, 'agreementLocationItemId'), 'AgreementLocationItem')
                        // mapping agreement location item with item usage record(if existed)
                        finalResultArray = await this.mapAgreementItemsWithItemUsage(resultArray, fetchItemUsageItems, 'agreementLocationItemId')
                    } else if (['Memorial'].includes(queryParams.filter)) {
                        fetchItemUsageItems = []
                        for (let resArr of resultArray) {
                            fetchItemUsageItems = await this.getItemUsageItems(_.pluck(resArr.items, 'agreementMemorialItemId'), 'AgreementMemorialItem')
                            resArr.items = await this.mapAgreementItemsWithItemUsage(resArr.items, fetchItemUsageItems, 'agreementMemorialItemId')
                            finalResultArray.push(resArr)
                        }
                    } else if (['Properties'].includes(queryParams.filter)) {
                        for (let data of result.propertiesDeatils) {
                            finalResultArray.push(this.mapPropertiesItemsWithItemUsage(data))
                        }
                    }

                    // applying pagination on finally generated outcome array. FYI: Here we are not able to apply pagination on database query.
                    // because we need to generate output with multiples of quantity, so applying pagination on finally generated aray.
                    const offset = (page - 1) * limit
                    const finalResult = finalResultArray.slice(offset).slice(0, limit)
                    return {
                        count: finalResultArray.length,
                        finalResult
                    }
                } else {
                    return {
                        count: 0,
                        finalResult: resultArray
                    }
                }
            } else {
                throw new Error('FILTER_IS_MANDITORY')
            }
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    /**
    * user story: ccs-7054
    * creating itemUsage record when user selected item in item consumption
    * @param {Object<{resourceId: Number}>} itemUsage is ItemUsage Propertes
    */
    async createItemUsageSelect (itemUsage, userId) {
        try {
            let itemUsageObject = {}
            let itemUsageStatus
            const personController = new PersonController(this.personId)
            await personController.getDetails()
            if (!this.personId) {
                throw new Error('PERSON_NOT_FOUND')
            }
            let payload = []
            if (!this.personId) {
                throw new Error('PERSON_NOT_FOUND')
            }
            itemUsageObject.resourceType = itemUsageResourceType[itemUsage.resourceType]
            itemUsageObject.personId = this.personId
            itemUsageObject.updatedBy = itemUsageObject.createdBy = itemUsage.createdBy
            if (['Merchandises', 'Services', 'addOns'].includes(itemUsage.resourceType)) {
                await this.findAgreementLocationItems(itemUsage.resourceId)
                if (itemUsage.resourceType === 'Services' && itemUsage.agreementType === 4) {
                    const selectedItem = await this.getWholeSaleCremationItemusageSelected()
                    if (selectedItem && selectedItem.length) {
                        throw new Error('UNSELECT_SERVICE_BEFORE_NEW_SERVICE_SELECT')
                    }
                }
                itemUsageStatus = await this._getItemUsageStatus('Selected')
                itemUsageObject.resourceId = itemUsage.resourceId
                itemUsageObject.usageStatus = itemUsageStatus.id
                payload.push(itemUsageObject)
            } else if (['Memorial'].includes(itemUsage.resourceType)) {
                await this.findAgreementMemorialItems(itemUsage.resourceIds)
                itemUsageStatus = await this._getItemUsageStatus('Used')
                const memorialItems = await this.getItemUsageItems(itemUsage.resourceIds, 'AgreementMemorialItem', 'resourceId', true)
                if (memorialItems.length) {
                    throw new Error('MEMORIAL_ITEM_IS_ALREADY_USED')
                }
                itemUsageObject.usageStatus = itemUsageStatus.id
                for (let resourceId of itemUsage.resourceIds) {
                    itemUsageObject.resourceId = resourceId
                    payload.push({ ...itemUsageObject })
                }
            } else if (['Properties'].includes(itemUsage.resourceType)) {
                await this.findAgreementPropertyItems(itemUsage.resourceId)
                itemUsageStatus = await this._getItemUsageStatus('Selected')
                itemUsageObject.resourceId = itemUsage.resourceId
                itemUsageObject.lotSpaceId = itemUsage.lotSpaceId
                itemUsageObject.usageStatus = itemUsageStatus.id
                payload.push(itemUsageObject)
            }

            const result = await models.sequelize.transaction(async (transaction) => {
                const itemUsages = await models.ItemUsage.bulkCreate(payload, {
                    transaction,
                    returning: true
                })
                if (itemUsages) {
                    if (['Memorial'].includes(itemUsage.resourceType)) {
                        const resourceIds = itemUsages.map(val => val.resourceId)
                        const itemUsageIds = itemUsages.map(val => val.id)
                        const itemUsageItems = await models.ItemUsage.findAll({
                            include: [
                                {
                                    model: models.AgreementMemorialItem,
                                    as: 'agreementMemorialItems'
                                }
                            ],
                            where: { resourceId: { [Op.in]: resourceIds }, resourceType: 'AgreementMemorialItem' },
                            transaction
                        })
                        // for cemetery agreement items, a purchase order should be created for each item usage so quantity is passed as 1
                        const payload = {
                            agreementMemorialId: itemUsageItems[0].agreementMemorialItems.agreementMemorialId,
                            agreementMemorialItemId: itemUsageItems[0].resourceId,
                            quantity: 1,
                            itemUsageIds
                        }

                        await PurchaseOrderController.createOrEditPurchaseOrder(payload, { id: itemUsage.createdBy }, transaction)
                    }
                }
                return itemUsages
            })
            if (result.length) {
                let selectedItems = await this.getItemUsageUpdatedData(_.pluck(result, 'id'), itemUsageResourceType[itemUsage.resourceType])
                if (selectedItems.length === 1) {
                    const [selectedItem] = selectedItems
                    selectedItems = selectedItem
                }
                // adding webcem job into queue
                const { queueNames, queues } = require('../../../appQueues')
                const webCemQueue = queues[queueNames.webCemQueue]
                const dataToSend = {
                    event: 'decedent.save',
                    payload: {
                        personId: this.personId,
                        userId: userId
                    }
                }
                webCemQueue.add('webCemQueue', dataToSend)
                return selectedItems
            }
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
    /**
     * user story: ccs-7054
     * updating itemUsage record when user unselecting item in item consumption.
     * @param {Number} itemUsageId
     * @param {string} timezone
     * @param {Number} userId
     */
    async updateItemUsageUnselect (itemUsageId, timezone, userId) {
        // const { queueNames, queues } = require('../../../appQueues')
        try {
            const SchedulingController = require('../schedulingController/schedulingController')
            const personController = new PersonController(this.personId)
            await personController.getDetails()
            for (let service of ['CasketSection', 'UrnInformationSection', 'VaultSection']) {
                let funeralCondition = ''
                if (service !== 'VaultSection') {
                    funeralCondition = `LEFT JOIN ScheduledFuneralService sfs ON sfs.${merchandiseSchedulingObject[service]}  = cs.id`
                }
                let resourceQuery = ` SELECT cs.id,${service !== 'VaultSection' ? 'sfs.id as funeralScheduling,' : ''} scs.id as cemeteryScheduling, wo.id,wo.completedOn FROM ${service} cs
                ${funeralCondition}
                LEFT JOIN ScheduledCemeteryService scs ON scs.${merchandiseSchedulingObject[service]} = cs.id
                INNER JOIN WorkOrder wo ON (${service !== 'VaultSection' ? "(wo.resourceId = sfs.id  AND wo.resourceType = 'ScheduledFuneralService') OR" : ''} (wo.resourceId = scs.id AND wo.resourceType = 'ScheduledCemeteryService')) 
              WHERE cs.${MerchandisesSection[service]} = ${itemUsageId}  AND cs.resourceType = 'ItemUsage'`

                let serviceDeatils = await models.sequelize.query(resourceQuery, {
                    type: models.sequelize.QueryTypes.SELECT
                })
                checkItemUsedOrSelect(serviceDeatils, 'Unselected')
            }
            const result = await models.sequelize.transaction(async (transaction) => {
                const itemsUnselect = await models.ItemUsage.update({
                    deletedAt: new Date(),
                    deletedBy: userId,
                    updatedBy: userId
                }, {
                    where: {
                        personId: this.personId,
                        id: itemUsageId
                    },
                    transaction
                })
                // Unselecting Selected Properties if any
                await intermentInfoSectionController.unselectProperty([itemUsageId], transaction)

                // Deleting related Cemetery Scheduling
                await SchedulingController.deleteScheduledCemeteryServices(itemUsageId, userId, timezone, transaction)
                // Removing the decedents and listing them that are  related to the property
                // Adding the webcem Events to queue
                // const webCemQueue = queues[queueNames.webCemQueue]
                // const dataToSend = {
                //     event: 'property.decedents.remove',
                //     payload: {
                //         triggerPoint: 'propertyUnselect',
                //         itemUsageIds: [itemUsageId],
                //         personId: this.personId
                //     }
                // }
                // webCemQueue.add('webCemQueue', dataToSend)
                return itemsUnselect
            })
            if (result[0] !== 0) {
                return {
                    message: 'Item unselected successfully'
                }
            } else {
                throw new Error('UNSELECTION_OF_ITEM_IN_ITEM_CONSUMPTION_FAILED')
            }
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
    /**
     * user story: ccs-7056
     * confirm item in itemUsage and need to create purchase order
     * TODO: create purchase order -- Venu
     * @param {Array} itemUsageIds is confirm itemUsage
     * @param {Number} userId is current User id
     * @param {boolean} calledFromApp is current User id
     * @param {boolean} workOrderCompleted
     */
    async updateItemUsageConfirm (itemUsageIds, userId, calledFromApp = true, workOrderCompleted = false) {
        try {
            const personController = new PersonController(this.personId)
            await personController.getDetails()
            if (calledFromApp) {
                for (let service of ['CasketSection', 'UrnInformationSection', 'VaultSection']) {
                    let funeralCondition = ''
                    if (service !== 'VaultSection') {
                        funeralCondition = `LEFT JOIN ScheduledFuneralService sfs ON sfs.${merchandiseSchedulingObject[service]}  = cs.id`
                    }
                    let resourceQuery = ` SELECT cs.id,${service !== 'VaultSection' ? 'sfs.id as funeralScheduling,' : ''}  scs.id as cemeteryScheduling FROM ${service} cs 
                    ${funeralCondition} 
                    LEFT JOIN ScheduledCemeteryService scs ON scs.${merchandiseSchedulingObject[service]} = cs.id
                  WHERE cs.${MerchandisesSection[service]} IN (${itemUsageIds.toString()}) AND cs.resourceType = 'ItemUsage'`
                    let serviceDeatils = await models.sequelize.query(resourceQuery, {
                        type: models.sequelize.QueryTypes.SELECT
                    })
                    checkItemUsedOrSelect(serviceDeatils, 'Used')
                }
            }

            const itemUsageStatus = await this._getItemUsageStatus('Used')
            const result = await models.sequelize.transaction(async (transaction) => {
                const itemsConfirm = await models.ItemUsage.update({
                    usageStatus: itemUsageStatus.id,
                    updatedBy: userId
                }, {
                    where: {
                        personId: this.personId,
                        id: { [Op.in]: [...itemUsageIds] },
                        deletedAt: null,
                        deletedBy: null
                    },
                    transaction
                })
                // TODO: create PO -- Venu
                if (!workOrderCompleted) {
                    const itemUsageItems = await models.ItemUsage.findAll({
                        where: { id: { [Op.in]: [...itemUsageIds] } },
                        include: [{
                            model: models.AgreementLocationItem,
                            as: 'agreementItems',
                            include: [{
                                model: models.Agreement,
                                as: 'agreementDetails',
                                include: [{
                                    model: models.SaleType,
                                    as: 'saleType'
                                }]
                            }]
                        }],
                        transaction
                    })
                    await Promise.all(itemUsageItems.map(async (item) => {
                        // for cemetery agreement items, a purchase order should be created for each item usage so quantity is passed as 1
                        let itemsAgreementType = lodash.get(item, 'agreementItems.agreementDetails.type')
                        let itemsSaleTypeAgreementType = lodash.get(item, 'agreementItems.agreementDetails.saleType.agreementType', null)
                        /** Note: Create purchase order for anything other than miscellaneous sales, or for those miscellaneous sales whose
                        sale type is of cemetery type. */
                        if ((itemsAgreementType !== 5) || ((itemsAgreementType === 5) && (itemsSaleTypeAgreementType === 2))) {
                            const payload = {
                                agreementLocationItemId: item.resourceId,
                                itemUsageId: item.id,
                                quantity: 1
                            }
                            await PurchaseOrderController.createOrEditPurchaseOrder(payload, { id: userId }, transaction)
                        }
                    }))
                }
                return itemsConfirm
            })
            if (result[0] !== 0) {
                return await this.getItemUsageUpdatedData(itemUsageIds, 'AgreementLocationItem')
            } else {
                throw new Error('SELECTED_ITEM_NOT_CONFIRMED_FOR_ITEM_CONSUMPTION')
            }
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    /**
     * @param {string} status values are 'Selected', 'Used
     */
    _getItemUsageStatus (status) {
        return models.ItemUsageStatus.findOne({ where: { status } })
    }
    /**
     * get itemUsage data after updates
     * @param {Array} itemUsageIds is to confirm in itemUsage
     * @param {Array} resourceType is a resourceType in itemUsage
     */
    async getItemUsageUpdatedData (itemUsageIds, resourceType) {
        let itemUsageArray = await this.getItemUsageItems(itemUsageIds, resourceType, 'id')
        itemUsageArray = itemUsageArray.map((item) => {
            return ItemUsageController.getItemsUsageFormatter(item)
        })
        return itemUsageArray
    }

    /**
     * mapping each agreement item with itemusage record
     * @param {*} agreemntItems is the array of agreement items
     * @param {*} itemUsageResult is the array of itemusage records
     * @param {*} itemIdName is the name of particular item id type
     */
    mapAgreementItemsWithItemUsage (agreemntItems, itemUsageResult, itemIdName) {
        agreemntItems = agreemntItems.map((agItem) => {
            let filteringItemUsageResult = itemUsageResult.find(i => i.resourceId === agItem[itemIdName])
            let index = itemUsageResult.indexOf(filteringItemUsageResult)
            if (index !== -1) {
                agItem.itemConsumptionResult = itemUsageResult[index] || null
                // deleting object form itemUsageResult
                itemUsageResult.splice(index, 1)
                // mapping with required information from itemUsageResult object
                if (agItem.itemConsumptionResult && agItem.itemConsumptionResult.person) {
                    agItem.itemConsumptionResult = ItemUsageController.getItemsUsageFormatter(agItem.itemConsumptionResult)
                } else {
                    agItem.itemConsumptionResult = null
                }
            }
            return agItem
        })
        return agreemntItems
    }
    /**
     * mapping each agreement property item with itemusage record
     * @param {*} properties
     */
    mapPropertiesItemsWithItemUsage (properties) {
        let agreementItems = {
            typeOfItem: properties.additionalAddendum ? 'addendum' : properties.addendumNumber ? 'addendum' : 'agreement',
            agreementLocationItemId: properties.id,
            itemCode: properties.itemCode,
            agreementPropertyId: properties.agreementPropertyId,
            itemName: properties.itemName,
            itemPrice: properties.itemPrice,
            propertyEcfAmount: properties.propertyEcfAmount,
            lotSpaceId: properties.lotSpaceId,
            contractNumber: properties.contractNumber,
            addendumNumber: properties.additionalAddendum ? properties.additionalAddendum : properties.addendumNumber ? properties.addendumNumber : null,
            itemConsumptionResult: null
        }
        if (properties.itemUsageId) {
            agreementItems.itemConsumptionResult = {
                itemUsageId: properties.itemUsageId,
                personId: properties.personId,
                personName: properties.personName,
                onePortalIdOfPerson: properties.onePortalIdOfPerson,
                status: properties.status,
                salesItemId: properties.Sale_Item_Id || null
            }
        }
        return agreementItems
    }
    /**
     * get ItemUsage Formatter
     * @param {Object<{id: Number, personId: Number, person: Object,status: string}>} itemConsumptionResult
     */
    static getItemsUsageFormatter (itemConsumptionResult) {
        return {
            itemUsageId: itemConsumptionResult.id,
            personId: itemConsumptionResult.personId,
            personName: [itemConsumptionResult.person.firstName, itemConsumptionResult.person.middleName, itemConsumptionResult.person.lastName].join(' ').trim(),
            onePortalIdOfPerson: itemConsumptionResult.person.personVerificationDetails && itemConsumptionResult.person.personVerificationDetails.onePortalId,
            status: itemConsumptionResult.status.status,
            salesItemId: itemConsumptionResult.Sale_Item_ID || null
        }
    }

    /**
     * Generating records with multiples of quantity
     * @param {*} array
     */
    _getItemsWithMultipleOfQuantity (array, quantity) {
        let newArr = []
        for (let index = 0; index < quantity; index++) {
            newArr.push({ ...array })
        }
        return newArr
    }

    /**
     * set final object for summary
     * @param {Array} cemetryCount
     * @param {Object} itemUsageType
     */
    _setItemUsageSummary (cemetryCount, itemUsageType) {
        cemetryCount.map((cremetry, index) => {
            itemUsageType[finalSummary[index]] = cremetry.count
        })
    }

    /**
     * set object for cemetry items for count and ids
     * @param {Array} cremetryData
     * @param {String} type is type of itemUsage
     */
    _getCemetryItemsCount (cremetryData, type) {
        let newObj = {
            count: 0,
            ids: {}
        }
        if (type === 'Properties' && cremetryData.propertiesDeatils && cremetryData.propertiesDeatils.length) {
            cremetryData.propertiesDeatils.map((properties) => {
                if (properties.agreementPropertyId && !properties.itemUsageId) {
                    newObj.count += 1
                }
                // if (newObj.ids[properties.agreemnpropId]) {
                //     newObj.ids[properties.agreemnpropId].push(properties.lotSpaceId)
                // } else {
                //     newObj.ids[properties.agreemnpropId] = [properties.lotSpaceId]
                // }
            })
        } else if (type !== 'Properties') {
            cremetryData.agreementPersons.map(agreementPerson => {
                if (type === 'Memorial') {
                    if (
                        agreementPerson &&
                        agreementPerson.Agreement &&
                        agreementPerson.Agreement.agreementMemorials &&
                        agreementPerson.Agreement.agreementMemorials.length
                    ) {
                        agreementPerson.Agreement.agreementMemorials.map(agreementMemorial => {
                            agreementMemorial.agreementMemorialItems.map((agreementMemorialItem) => {
                                newObj.count += agreementMemorialItem.agreementItemPrice.quantity
                                newObj.ids[agreementMemorialItem.id] =
                                agreementMemorialItem.agreementItemPrice.quantity
                            })
                        })
                    }
                } else {
                    if (
                        agreementPerson &&
                        agreementPerson.Agreement &&
                        agreementPerson.Agreement.agreementItems.length
                    ) {
                        agreementPerson.Agreement.agreementItems.map(agreementItem => {
                            newObj.count += agreementItem.agreementItemPrice.quantity
                            newObj.ids[agreementItem.id] =
                                    agreementItem.agreementItemPrice.quantity
                        })
                    }
                }
            })
        }

        return newObj
    }

    /**
     * remove items count used in item usage
     * @param {Object} itemUsage
     * @param {Number} index
     * @param {Object} cemetryCount
     */
    _getItemUsageCount (itemUsage, index, cemetryCount) {
        itemUsage.map(item => {
            if (cemetryCount[index] && cemetryCount[index].ids[item.resourceId]) {
                cemetryCount[index].count -= 1
            }
        })
    }

    /**
     * Query execuiton for fetching merchandise and service items which are selected as part of cemetery contract creation
     * @param {string} type values are 'Merchandises', 'Services'
     */
    async getCemetryItemsMerchandiseAndServices (type) {
        let agreementType = Number(getKey(seed.ContractType, 'CEMETRY'))
        let wholeSaleAgreementType = Number(getKey(seed.ContractType, 'WHOLESALE CREMATION'))
        // let misSalescAgreementType = Number(getKey(seed.ContractType, 'Miscellaneous Sales'))
        const selectedItems = await models.Person.findOne({
            where: {
                id: this.personId,
                isAlive: false
            },
            attributes: ['id'],
            include: [
                {
                    model: models.AgreementPerson,
                    as: 'agreementPersons',
                    where: {
                        personId: this.personId
                    },
                    attributes: ['id', 'agreementId', 'roleId'],
                    include: [
                        {
                            model: models.AgreementRole,
                            as: 'agreementRole',
                            where: {
                                name: 'Beneficiary'
                            },
                            required: true
                        },
                        {
                            model: models.Agreement,
                            where: {
                                // Note: commented misSalescAgreementType from the type param to remove miscellaneous items from the item usage summary
                                type: { [Op.in]: [agreementType, wholeSaleAgreementType] },
                                contractNumber: {
                                    [Op.ne]: null
                                }
                            },
                            include: [await agreementItemIncludeObj(type)] // agreementItemIncludeObj includes agreementLocationItem to itemType tables.
                        }
                    ]
                }
            ]
        })
        return selectedItems
    }

    /**
     * get merchandise and service cemetry items in itemUsage
     * @param {Array} ids
     * @param {*} resourceType
     * @param {*} type
     */
    async getItemUsageItems (ids, resourceType, type = 'resourceId', memorialCondition = false) {
        let toFind = { resourceId: { [Op.in]: [...ids] } }
        if (type === 'id') {
            toFind = { id: { [Op.in]: [...ids] } }
        }
        let includesList
        if (memorialCondition) {
            includesList = [agreementMemorialItemIncludesObj(['Memorial'])]
        } else {
            includesList = [itemUsageStatusIncludeObj({}), personDetailsIncludeObj()]
        }
        const fetchItemsFromItemUsage = await models.ItemUsage.findAll({
            where: {
                [Op.and]: [
                    { personId: { [Op.ne]: null } },
                    { resourceType },
                    { deletedAt: null },
                    { deletedBy: null },
                    toFind
                ]
            },
            include: includesList
        })
        return fetchItemsFromItemUsage
    }

    /**
     * user story: ccs-7055
     * get selected merchandise items
     */
    async getSelectedMerchandiseItems (itemType, itemCategory) {
        try {
            const personController = new PersonController(this.personId)
            await personController.getDetails()
            let result = []
            result = await models.ItemUsage.findAll({
                where: {
                    [Op.and]: [
                        { personId: this.personId },
                        { resourceType: 'AgreementLocationItem' },
                        { deletedAt: null },
                        { deletedBy: null }
                    ]
                },
                include: [
                    itemUsageStatusIncludeObj({ status: 'Selected' }),
                    await agreementItemIncludeObj(itemType, itemCategory)
                ]
            })
            if (result && result.length) {
                result = result.map(agItem => {
                    let agItemDetails = agItem.agreementItems
                    if (agItemDetails) {
                        return {
                            agreementLocationItemId: agItemDetails.id,
                            itemCode: agItemDetails.locationItem.Item.code,
                            itemName: agItemDetails.locationItem.Item.name,
                            itemPrice: agItemDetails.agreementItemPrice.unitPrice + agItemDetails.agreementItemPrice.unitTax,
                            contractNumber: agItemDetails.agreementDetails.contractNumber,
                            addendumNumber: agItemDetails.addendumDetails ? agItem.agreementItems.addendumDetails.addendumNumber : null,
                            itemUsageId: agItem.id,
                            isSchedulable: itemType === 'Services' ? agItemDetails.locationItem.Item.itemAttributes.find(ia => ia.AttributeValue && ia.AttributeValue.attribute && ia.AttributeValue.attribute.name === 'Scheduling Service') !== undefined : false
                        }
                    }
                }).filter(obj => obj != null)
                return result
            } else {
                return result
            }
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
    /**
    * get Agreement Memorial details
    * @param {String} itemCategory is a type item to find
    */
    async getCemetryItemsMemorials (itemCategory) {
        if (!itemCategory) {
            itemCategory = ['Foundation', 'Memorial', 'Monument Add On', 'Monument Base']
        }
        let agreementType = Number(getKey(seed.ContractType, 'CEMETRY'))
        const selectedItems = await models.Person.findOne({
            where: {
                id: this.personId,
                isAlive: false
            },
            attributes: ['id'],
            include: [
                {
                    model: models.AgreementPerson,
                    as: 'agreementPersons',
                    where: {
                        personId: this.personId
                    },
                    attributes: ['id', 'agreementId', 'roleId'],
                    include: [
                        {
                            model: models.AgreementRole,
                            as: 'agreementRole',
                            where: {
                                name: 'Beneficiary'
                            },
                            required: true
                        },
                        {
                            model: models.Agreement,
                            where: {
                                type: agreementType,
                                contractNumber: {
                                    [Op.ne]: null
                                }
                            },
                            include: [
                                {
                                    model: models.AgreementMemorial,
                                    as: 'agreementMemorials',
                                    require: true,
                                    where: { deletedAt: null },
                                    include: [
                                        agreementMemorialItemIncludesObj([...itemCategory]),
                                        {
                                            model: models.Addendum,
                                            as: 'addendum',
                                            attributes: ['addendumNumber']
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        })
        return selectedItems
    }

    static async deleteItemUsage (locationItemId, resourceId, itemQty, userId, timezone, transaction) {
        const SchedulingController = require('../schedulingController/schedulingController')
        let consumedItems = await models.ItemUsage.findAll({
            where: {
                resourceId: resourceId,
                resourceType: 'AgreementLocationItem',
                deletedAt: null,
                deletedBy: null
            },
            include: [
                {
                    model: models.ItemUsageStatus,
                    as: 'status',
                    attributes: ['status']
                }
            ],
            transaction
        })
        let selectedItems = consumedItems.filter(e => e.status.status === 'Selected')
        let usedItems = consumedItems.filter(e => e.status.status === 'Used')
        if (usedItems.length && itemQty < usedItems.length) {
            throw new Error('Item(s) utilized in service schedule cannot be updated/removed')
        } else if (selectedItems.length && itemQty < consumedItems.length) {
            selectedItems.length = consumedItems.length - itemQty
            const locItem = await models.LocationItem.scope('withItemCategoryandItemType').findOne({
                where: {
                    id: locationItemId
                }
            })
            const itemType = locItem.Item.ItemCategory.ItemType.name
            await Promise.all(selectedItems.map(async (itemUsage) => {
                if (itemType === 'Services') {
                    // Deleting related Cemetery Scheduling
                    await SchedulingController.deleteScheduledCemeteryServices(itemUsage.id, userId, timezone, transaction)
                }
                if (itemType === 'Merchandises') {
                    const itemCategory = locItem.Item.ItemCategory.name
                    // TODO: Deleting related POs by Venu
                    // Make CasketId, UrnId and VaultId NULL if any
                    if (itemCategory === 'Casket') {
                        await models.CasketSection.update({
                            casketId: null,
                            resourceType: null
                        }, {
                            where: {
                                casketId: itemUsage.id,
                                resourceType: 'ItemUsage'
                            },
                            transaction
                        })
                    } else if (itemCategory === 'Urn') {
                        await models.UrnInformationSection.update({
                            urnId: null,
                            resourceType: null
                        }, {
                            where: {
                                urnId: itemUsage.id,
                                resourceType: 'ItemUsage'
                            },
                            transaction
                        })
                    } else if (itemCategory === 'Vault') {
                        await models.VaultSection.update({
                            vaultId: null,
                            resourceType: null
                        }, {
                            where: {
                                vaultId: itemUsage.id,
                                resourceType: 'ItemUsage'
                            },
                            transaction
                        })
                    }
                }
                await models.ItemUsage.update({
                    deletedAt: new Date(),
                    deletedBy: userId
                }, {
                    where: { id: itemUsage.id },
                    transaction
                })
            }))
        }
    }
    /**
     * get confirmed properties item with lotspaceId
     */
    async getCemeteryItemProperties () {
        let propertyQueries = `
        SELECT p.id as personId,pverde1.onePortalId as onePortalIdOfPerson, p1.firstName as personFirstName, p1.middleName as personMiddleName, p1.lastName as personLastName, lotsp.Lot_Space_ID as lotSpaceId,lotsp.Lot_Sell_Unit_ID as lotSellUnitId, agrmtprop.id as agreementPropertyId,addendum.addendumNumber,agrmt.contractNumber as contractNumber,prop.name as itemName,propTypeCode.propertyTypeId,prop.lotSellUnitId,prop.price as itemPrice,prop.ecfAmount as propertyEcfAmount,prop.propertyItemCode as itemCode,itemus.id as itemUsageId,itemusstatus.status, additionaladdendum.addendumNumber as additionalAddendum, itemus.Sale_Item_Id FROM Person p
        INNER JOIN PersonVerificationDetails pverde On pverde.personId = p.id
        INNER JOIN AgreementRole agrmtrole on agrmtrole.name = 'Beneficiary' 
        INNER JOIN AgreementPerson agrmtper on agrmtper.personId = p.id AND agrmtper.roleId = agrmtrole.id AND agrmtper.deletedBy is null AND agrmtper.deletedAt is null
        INNER JOIN Agreement agrmt on agrmt.id = agrmtper.agreementId AND agrmt.contractNumber IS NOT NULL
        INNER JOIN AgreementProperty agrmtprop on agrmtprop.agreementId = agrmt.id AND agrmtprop.reservationStatus = 'confirmed' AND agrmtprop.deletedAt IS NULL AND agrmtprop.deletedBy IS NULL
        LEFT JOIN Addendum addendum on  addendum.id = agrmtprop.addendumId
        INNER JOIN Property prop on prop.id = agrmtprop.propertyId
        INNER JOIN PropertyTypeCode propTypeCode on propTypeCode.id = prop.propertyTypeCodeId
        INNER JOIN [${hmisDBHost}].${hmisDB}.dbo.lot_space lotsp  ON lotsp.Lot_Sell_Unit_ID = prop.lotSellUnitId
        LEFT JOIN LotSpace lot ON lot.lotSpaceId = lotsp.Lot_Space_ID
        LEFT JOIN AgreementPropertyAdditionalRight agrmtpropadd ON agrmtpropadd.lotSpaceId = lot.id AND agrmtpropadd.deletedAt IS NULL
        LEFT JOIN Addendum additionaladdendum on  additionaladdendum.id = agrmtpropadd.addendumId
        LEFT  JOIN ItemUsage itemus ON itemus.resourceId = agrmtprop.id AND itemus.lotSpaceId = lotsp.Lot_Space_ID AND itemus.deletedAt IS NULL AND itemus.deletedBy IS NULL
        LEFT JOIN ItemUsageStatus itemusstatus ON itemusstatus.id = itemus.usageStatus
        LEFT JOIN Person p1 ON p1.id = itemus.personId
        LEFT JOIN PersonVerificationDetails pverde1 On pverde1.personId = p1.id
        WHERE agrmtper.personId = ${this.personId}`

        let propertiesDeatils = await models.sequelize.query(propertyQueries, {
            type: models.sequelize.QueryTypes.SELECT
        })
        let agreementPropertyIds = []
        if (propertiesDeatils.length) {
            propertiesDeatils.map(eachProperty => {
                eachProperty.personName = [eachProperty.personFirstName, eachProperty.personMiddleName, eachProperty.personLastName].join(' ').trim()
                return eachProperty
            })
            agreementPropertyIds = propertiesDeatils.map((properties) => properties.agreementPropertyId)
            agreementPropertyIds = Array.from(new Set(agreementPropertyIds)).join(',')
            let propertyRightsQuery = `SELECT agrmtpropright.id, lsp.lotSpaceId from AgreementPropertyAdditionalRight agrmtpropright
        INNER JOIN LotSpace lsp on lsp.id = agrmtpropright.lotSpaceId
         WHERE agreementPropertyId IN(${agreementPropertyIds}) AND deletedAt IS NOT NULL AND deletedBy  IS NOT NULL`
            const lopSpaceIds = await models.sequelize.query(propertyRightsQuery, { type: models.sequelize.QueryTypes.SELECT })
            if (lopSpaceIds && lopSpaceIds.length) {
                let lotSpaceIdsObject = {}
                lopSpaceIds.map((data) => {
                    lotSpaceIdsObject[data.lotSpaceId] = 1
                })
                propertiesDeatils = propertiesDeatils.filter((properties) => !lotSpaceIdsObject[properties.lotSpaceId])
            }
        }
        return { propertiesDeatils }
    }
    async getIntermentDetails (personId, scheduledId) {
        let scheduledData = await models.ScheduledCemeteryService.scope(
            'intermentInformationSectionScope')
            .findOne({
                where: { personId, id: scheduledId },
                attributes: ['id', 'itemUsageId']
            })
        if (scheduledData && scheduledData.intermentInformationDetails) {
            scheduledData = scheduledData.toJSON()
            if (scheduledData.intermentInformationDetails.properties.length) {
                let reqData = scheduledData.intermentInformationDetails.properties
                if (reqData && reqData.length) {
                    scheduledData.intermentInformationDetails.propertyDetails = reqData.map(e => {
                        return {
                            itemUsageId: e.propertyId,
                            propertyId: e.itemUsage.agreementProperties.property.id,
                            propertyName: e.itemUsage.agreementProperties.property.name,
                            lotSellUnitId: e.itemUsage.agreementProperties.property.lotSellUnitId,
                            lotSpaceId: e.itemUsage.lotSpaceId
                        }
                    })
                }
                delete scheduledData.intermentInformationDetails.properties
            }
        }
        return scheduledData
    }
    async getConsumedProperties (personId, serviceName, scheduledId) {
        try {
            const SchedulingController = require('../schedulingController/schedulingController')
            let schedulableServices = await SchedulingController.getSchedulableServices(personId)
            let cgs = []
            let cwcs = []
            schedulableServices.forEach(e => {
                if (e.schedulingAttribute === 'Cemetery Graveside Service' && e.scheduledCemeteryService !== null) {
                    cgs.push(e)
                }
                if ((e.schedulingAttribute === 'Cemetery Cremation Service' || e.schedulingAttribute === 'Cemetery Witness Cremation Services') && e.scheduledCemeteryService !== null) {
                    cwcs.push(e)
                }
            })
            let res = await models.ItemUsage.scope('itemUsageStatusScope', 'agreementProperty').findAll({
                where: {
                    personId: this.personId,
                    resourceType: 'AgreementProperty',
                    deletedAt: null,
                    deletedBy: null
                }
            })
            let existingProps = await models.ScheduledCemeteryService.scope('intermentInformationSectionScope').findAll({
                where: {
                    personId: this.personId,
                    deletedAt: null,
                    deletedBy: null
                }
            })
            existingProps = JSON.parse(JSON.stringify(existingProps))
            let props
            if (existingProps.length) {
                props = existingProps.map(e1 => {
                    if (e1.intermentInformationDetails && e1.intermentInformationDetails.properties.length) {
                        return e1.intermentInformationDetails.properties.map(e => {
                            return e && e.intermentInfoSectionId ? e.propertyId : null
                        })
                    } else {
                        return null
                    }
                })
            }
            props = _.compact(_.flatten(props))
            let cgCreatedAt, scheduledData, scheduledProps
            if (cgs.length) {
                cgCreatedAt = cgs[0].scheduledCemeteryService.createdAt
            }
            if (cgs.length > 1) {
                cgs.forEach(e => {
                    if (new Date(cgCreatedAt).getTime() > new Date(e.scheduledCemeteryService.createdAt).getTime()) {
                        cgCreatedAt = e.scheduledCemeteryService.createdAt
                    }
                })
            }
            if (scheduledId && serviceName === 'Cemetery Graveside Service') {
                scheduledData = await this.getIntermentDetails(personId, scheduledId)
                scheduledProps = scheduledData.intermentInformationDetails && scheduledData.intermentInformationDetails.propertyDetails ? scheduledData.intermentInformationDetails.propertyDetails : []
                if (scheduledProps && scheduledProps.length) {
                    scheduledProps = scheduledProps.map(e => {
                        return e.itemUsageId
                    })
                    props = _.difference(props, scheduledProps)
                }
            }
            let [cc] = cwcs
            let scheduledCC, ccProps, ccCreatedAt
            if (cc) {
                ccCreatedAt = cc.scheduledCemeteryService.createdAt
                if (!cgCreatedAt || new Date(cgCreatedAt).getTime() < new Date(ccCreatedAt).getTime()) {
                    scheduledCC = await this.getIntermentDetails(personId, cc.scheduledCemeteryService.id)
                    ccProps = scheduledCC.intermentInformationDetails && scheduledCC.intermentInformationDetails.propertyDetails ? scheduledCC.intermentInformationDetails.propertyDetails : []
                    if (ccProps && ccProps.length) {
                        ccProps = ccProps.map(e => {
                            return e.itemUsageId
                        })
                    }
                }
            }
            let selectedProperties = []
            let usedProperties = []
            if (res.length) {
                await Promise.all(res.map(async e => {
                    let propertyTypeRes = await models.PropertyTypeCode.findOne({
                        where: { id: e.agreementProperties.property.propertyTypeCodeId },
                        include: [{
                            model: models.PropertyType,
                            as: 'propertyType',
                            required: true,
                            attributes: ['name']
                        }]
                    })
                    let i = {
                        propertyName: e.agreementProperties.property.name,
                        lotSpaceId: e.lotSpaceId,
                        agreementPropertyId: e.resourceId,
                        itemUsageId: e.id,
                        propertyType: propertyTypeRes ? propertyTypeRes.propertyType.name : ''
                    }
                    if (e.status.status === 'Selected') {
                        if (serviceName !== 'Cemetery Cremation Service' && serviceName !== 'Cemetery Witness Cremation Services') {
                            if (ccProps && ccProps.length) {
                                props = _.difference(props, ccProps)
                                if (ccProps && ccProps.length && ccProps.indexOf(e.id) !== -1 && (!(props && props.length) || (props && props.length && props.indexOf(e.id) === -1))) {
                                    selectedProperties.push(i)
                                }
                            } else if (!(props && props.length) || (props && props.length && props.indexOf(e.id) === -1)) {
                                selectedProperties.push(i)
                            }
                        } else {
                            if ((props.length && props.indexOf(e.id) !== -1) || (ccProps && ccProps.length && props.length && _.intersection(ccProps, props).length === props.length)) {
                                selectedProperties.push(i)
                            } else if (!(props && props.length)) {
                                selectedProperties.push(i)
                            }
                        }
                    } else if (e.status.status === 'Used') {
                        usedProperties.push(i)
                    }
                }))
            }
            return { selectedProperties, usedProperties }
        } catch (error) {
            throw new Error(error)
        }
    }

    static async getStatusOfItemUsage (data, transaction) {
        let res = await models.ItemUsage.scope('itemUsageStatusScope').findOne({
            where: data, transaction
        })
        if (res) {
            return res.status.status
        } else {
            return res
        }
    }

    static async getConsumedItems (data, transaction) {
        let usedStatus = await models.ItemUsageStatus.findOne({ where: { status: 'Used' } })
        data.usageStatus = usedStatus.id
        let result = await models.ItemUsage.findAll({
            where: data, transaction
        })
        return result
    }

    static async unselectItemUsage (resourceIds, itemUsageIds, userId, transaction) {
        const res = await models.ItemUsage.update({
            deletedAt: new Date(),
            deletedBy: userId,
            updatedBy: userId
        }, {
            where: {
                id: { [Op.in]: itemUsageIds }
            },
            transaction
        })
        // Adding the job to webcem queue to list the decedents associated to the properties

        // const { queueNames, queues } = require('../../../appQueues')
        // const webCemQueue = queues[queueNames.webCemQueue]
        // const dataToSend = {
        //     event: 'property.decedents.remove',
        //     payload: {
        //         triggerPoint: 'propertyRelease',
        //         resourceIds: resourceIds
        //     }
        // }
        // webCemQueue.add('webCemQueue', dataToSend)
        return res
    }

    static async unselectPropertiesItemUsage (userId, resourceIds, lotSpaceId, transaction) {
        let whereCondition = {
            resourceType: 'AgreementProperty',
            resourceId: { [Op.in]: resourceIds },
            deletedAt: null,
            deletedBy: null
        }
        if (lotSpaceId) {
            whereCondition.lotSpaceId = lotSpaceId
        }
        const propItemUsages = await models.ItemUsage.findAll({
            where: whereCondition,
            transaction
        })
        let itemUsageIds = propItemUsages.map(e => e.id)
        await ItemUsageController.unselectItemUsage(resourceIds, itemUsageIds, userId, transaction)
        await intermentInfoSectionController.unselectProperty(itemUsageIds, transaction)
    }
    /**
     * get whole sale cremation itemusage selected data
     */
    async getWholeSaleCremationItemusageSelected () {
        let query = `SELECT * FROM ItemUsage itemus
        INNER JOIN AgreementLocationItem agmtlocitem on agmtlocitem.id = itemus.resourceId
        INNER JOIN LocationItem locit on locit.id = agmtlocitem.locationItemId
        INNER JOIN Item it on it.id = locit.itemId
        INNER JOIN ItemCategory itcat on itcat.id = it.itemCategoryId AND itcat.name = 'Wholesale Cremation'
        WHERE itemus.personId = ${this.personId}  AND itemus.resourceType = 'AgreementLocationItem' AND itemus.deletedAt IS NULL AND itemus.deletedBy IS NULL
        `
        let selectedItem = await models.sequelize.query(query, {
            type: models.sequelize.QueryTypes.SELECT
        })
        return selectedItem
    }

    /**
     * @description This method is used to update the other addOns selected for the person as Used
     * @param {Number} userId id of the user currently loggedIn
     * @param {*} transaction
     */
    async updateOtherItemsOfWholesaleAsUsed (userId, transaction) {
        const itemUsageStatus = await this._getItemUsageStatus('Used')
        const selectedStatus = await this._getItemUsageStatus('Selected')

        const query = `SELECT itemus.id FROM ItemUsage itemus
        INNER JOIN AgreementLocationItem agmtlocitem on agmtlocitem.id = itemus.resourceId
        INNER JOIN LocationItem locit on locit.id = agmtlocitem.locationItemId
        INNER JOIN Item it on it.id = locit.itemId
        INNER JOIN ItemCategory itcat on itcat.id = it.itemCategoryId AND itcat.name IN ('Wholesale Cremation Add on', 'Wholesale Cremation Fee')
        WHERE itemus.personId = ${this.personId}  AND itemus.resourceType = 'AgreementLocationItem' AND itemus.deletedAt IS NULL AND itemus.deletedBy IS NULL
        `
        const itemUsageIds = await models.sequelize.query(query, {
            type: models.sequelize.QueryTypes.SELECT,
            transaction
        })
        if (itemUsageIds.length) {
            const updateResult = await models.ItemUsage.update({
                usageStatus: itemUsageStatus.id,
                updatedBy: userId
            }, {
                where: {
                    deletedAt: null,
                    deletedBy: null,
                    id: { [Op.in]: itemUsageIds.map(val => val.id) },
                    usageStatus: selectedStatus.id
                }
            })
            return updateResult
        }
    }
}
module.exports = exports = ItemUsageController
