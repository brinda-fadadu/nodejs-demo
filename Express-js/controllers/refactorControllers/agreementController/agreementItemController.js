const models = require('../../../models/index')
const AgreementItemPriceController = require('./agreementItemPriceController')
// const AddendumController = require('./addendum')
const SchedulingController = require('../schedulingController/schedulingController')
const ItemUsageController = require('../itemUsageController/itemUsageController')
const ItemController = require('../itemController/itemController')
const { upsert } = require('../utils')
const _ = require('lodash')
const moment = require('moment')
const ChangeLogController = require('./changeLog')
const logger = require('../../../lib/logger')
const { getKey } = require('../../../lib/util')
const { seed } = require('../../../config/seed')
const AgreementCashAdvancedController = require('./agreementCashAdvanceItemController')
const AgreementPackageController = require('./agreementPackageController')
const PropertyController = require('./agreementPropertiesController')
const agreementSpecialOrderRequestController = require('./agreementSpecialOrderRequestController')
const AgreementMemorialController = require('./agreementMemorialController')
const AddendumController = require('./addendum')
const PayorController = require('../paymentController/payerController')
const { createStatementInvoice } = require('../../../appQueues/createStatementInvoice')
const fs = require('fs')
const util = require('util')
const unlink = util.promisify(fs.unlink)

// TODO: Remove after packages
/* const validateConfig = {
    'Package': {
        maxQuantity: 1
    },
    'LocationItem': {
        maxQuantity: null
    }
} */

class AgreementItemController extends AgreementItemPriceController {
    constructor (agreementId) {
        super()
        this.agreementId = agreementId
    }

    /**
     * to add/remove/update items for a agreement
     * @param {string} action - action is add/remove/update
     * @param {Object} payload
     * @param {number} payload.userId - id of the currently logged in user
     * @param {boolean} payload.removeAll - boolean to define if all the items of the agreement to be removed or not
     * @param {number} payload.locationItemId - id of the item to be added/removed/updated for the agreement
     * @description This method is used to add/remove items from a agreement/addendum
     */
    async createOrUpdate (action, payload) {
        let transaction
        const userId = payload.userId
        try {
            let inProgressAddendum
            transaction = await models.sequelize.transaction()
            const AgreementController = require('./agreementController')
            const AddendumController = require('./addendum')
            const agreementController = new AgreementController(this.agreementId)
            const addendumController = new AddendumController(this.agreementId)
            const agreement = await agreementController.getAgreementDetails(transaction)
            inProgressAddendum = await addendumController.getInProgressAddendum(transaction)

            if (!payload.addendumId) {
                payload.addendumId = null
                if (agreement.status === 'Submitted' && (!inProgressAddendum || !payload.addendumId)) {
                    throw new Error('AGREEMENT_ALREADY_COMPLETED')
                }
            } else {
                if (action === 'add' && (payload.addendumId !== inProgressAddendum.id)) {
                    throw new Error('ADDENDUM_ALREADY_COMPLETED')
                }
            }
            let existingAgreementItem = null
            if (payload.agreementLocationItemId) {
                existingAgreementItem = await models.AgreementLocationItem.findOne({
                    where: {
                        id: payload.agreementLocationItemId
                    },
                    include: [{
                        model: models.AgreementItemPrice,
                        as: 'agreementItemPrice'
                    }, {
                        model: models.LocationItem,
                        as: 'locationItem',
                        attributes: ['id', 'itemId'],
                        required: true,
                        include: [
                            {
                                model: models.Item,
                                attributes: ['id'],
                                required: true,
                                include: [
                                    {
                                        model: models.ItemCategory,
                                        attributes: ['id', 'name'],
                                        required: true,
                                        include: [
                                            {
                                                model: models.ItemType,
                                                attributes: ['id', 'name']
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }],
                    transaction
                })
            }
            const existingAgreementItemQuantity = _.get(existingAgreementItem, 'agreementItemPrice.quantity', 0)
            if (existingAgreementItemQuantity === 0 && action === 'remove') {
                throw new Error(`${_.upperCase('LOCATION_ITEM').split(' ').join('_')}_ALREADY_${action === 'add' ? 'ADDED' : 'REMOVED'}`)
            }
            const locationItemDetails = await models.LocationItem.findOne({ where: { id: payload.locationItemId, locationId: agreement.locationId }, transaction })
            let quantity = await this._updateQuantity(action, payload, existingAgreementItemQuantity)
            const agreementItemPricePayload = {
                price: locationItemDetails.price,
                quantity: quantity,
                agreementItemPriceId: _.get(existingAgreementItem, 'agreementItemPriceId', null),
                locationItemId: payload.locationItemId // To calculate tax value
            }
            let agreementItemPayload = {
                id: _.get(existingAgreementItem, 'id'),
                agreementId: this.agreementId,
                locationItemId: payload.locationItemId
            }
            if (!payload.removeAll) {
                const agreementItemPrice = await this.upsertAgreementItemPrice(agreementItemPricePayload, transaction)
                agreementItemPayload = {
                    ...agreementItemPayload,
                    agreementItemPriceId: _.get(agreementItemPrice, 'id')
                }
            }
            if (action === 'add') {
                agreementItemPayload.addendumId = payload.addendumId || null
            }
            if (quantity === 0) {
                agreementItemPayload.deletedBy = userId
                agreementItemPayload.deletedAt = moment().format('YYYY/MM/DD HH:mm:ss')
            }
            //  This is only for removing Scheduled Services
            if (action === 'remove') {
                let schedulingPayload = {
                    agreementLocationItemId: existingAgreementItem.id,
                    quantity: existingAgreementItemQuantity,
                    removeAll: payload.removeAll,
                    type: agreement.type,
                    apiType: payload.apiType,
                    itemCategoryName: existingAgreementItem.locationItem.Item.ItemCategory.ItemType.name,
                    merchandisesType: ['Urn', 'Casket'].includes(existingAgreementItem.locationItem.Item.ItemCategory.name) ? existingAgreementItem.locationItem.Item.ItemCategory.name : null
                }
                // Note: cemeteryMiscSales is a variable to identify if the received item belongs to a cemetery misc sales or not.
                let cemeteryMiscSales = agreement.type === Number(getKey(seed.ContractType, 'Miscellaneous Sales')) && agreement.saleType.agreementType === Number(getKey(seed.ContractType, 'CEMETRY'))
                const model = cemeteryMiscSales ? 'ScheduledCemeteryService' : 'ScheduledFuneralService'
                if (agreement.type === Number(getKey(seed.ContractType, 'FUNERAL')) || cemeteryMiscSales ||
                    (agreement.type === Number(getKey(seed.ContractType, 'Miscellaneous Sales')) && agreement.saleType.agreementType === Number(getKey(seed.ContractType, 'FUNERAL')))) {
                    await SchedulingController.deleteScheduledFuneralServices(this.agreementId, schedulingPayload, userId, payload.timezone, transaction, model)
                }

                if (agreement.type === Number(getKey(seed.ContractType, 'CEMETRY')) || agreement.type === Number(getKey(seed.ContractType, 'WHOLESALE CREMATION'))) {
                    await ItemUsageController.deleteItemUsage(payload.locationItemId, existingAgreementItem.id, quantity, userId, payload.timezone, transaction)
                }
            }
            const upsertedAgreementItem = await upsert('AgreementLocationItem', agreementItemPayload, transaction, { userId: userId })
            if (quantity === 0) {
                await models.AgreementLocationItem.destroy({
                    where: {
                        id: agreementItemPayload.id
                    },
                    transaction
                })
            }
            // Recalculating the agreement adjustment promocode discounts
            let AdjustmentsController = require('../adjustmentController/discountsAndAdjustmentsHandler')
            const adjController = new AdjustmentsController()
            await adjController.reCalculatePromoCodeDiscounts(this.agreementId, payload.userId, transaction)
            const agreementSummary = await models.Agreement.updateAndGetTotal(this.agreementId, payload.userId, transaction, payload.addendumId)
            if (payload.removeAll) {
                await ChangeLogController.recordBulkDeleteAction(action, upsertedAgreementItem.id, 'AgreementLocationItem', transaction)
            } else {
                await ChangeLogController.recordAction(action, upsertedAgreementItem.id, 'AgreementLocationItem', transaction)
            }
            await transaction.commit()
            // TODO: Add change log here
            return {
                ...agreementSummary,
                ...upsertedAgreementItem.toJSON(),
                ...agreementItemPricePayload
            }
        } catch (error) {
            logger.error(error)
            await transaction.rollback()
            throw error
        }
    }

    /**
     * @param {string} action - action is add/remove/update
     * @param {Object} payload
     * @param {number} payload.userId - id of the currently logged in user
     * @param {number} payload.itemId - id of the item
     * @param {number} upsertedAgreementItem
     * @param {*} transaction
     */
    async _upsertSubAgreementItem (action, payload, upsertedAgreementItem, transaction) {
        switch (action) {
        case 'add':
            const packageItems = await models.PackageLocationItem.findAll({
                include: [
                    {
                        model: models.LocationItem,
                        as: 'locationItem'
                    }
                ],
                where: {
                    packageId: payload.itemId,
                    isActive: true
                },
                transaction
            })
            const subAgreementItemPayload = packageItems.map(async eachPackageItem => {
                // get the tax percent
                let taxPercent = await this.getTaxPercent(eachPackageItem.locationItem.id, transaction)
                return {
                    tax: taxPercent * eachPackageItem.locationItem.price,
                    price: eachPackageItem.locationItem.price,
                    parentId: upsertedAgreementItem.id,
                    quantity: eachPackageItem.quantity,
                    createdBy: payload.userId,
                    updatedBy: payload.userId,
                    resourceId: eachPackageItem.id,
                    agreementId: this.agreementId,
                    resourceType: 'PackageLocationItem'
                }
            })
            await models.AgreementItem.bulkCreate(subAgreementItemPayload, { transaction })
            break
        case 'remove':
            await models.AgreementItem.update({ deletedAt: moment().format('YYYY/MM/DD HH:mm:ss'), deletedBy: payload.userId }, {
                where: { parentId: upsertedAgreementItem.id },
                transaction
            })
            break
        default:
            break
        }
    }

    /**
     * @param {string} action it defines the action to be performed on the item
     * @param {boolean} removeAll boolean to define if all the items of the agreement to be removed or not
     * @param {number} prevQuantity previous quantity of the item
     */
    _updateQuantity (action, payload, prevQuantity) {
        switch (action) {
        case 'add':
            if (payload.quantity) {
                return prevQuantity + payload.quantity
            } else if (!payload.quantity) {
                return prevQuantity + 1
            }
            break
        case 'remove':
            return payload.removeAll ? 0 : prevQuantity - 1
        default:
            return prevQuantity
        }
    }

    async getAgreementItems () {
        try {
            const agreementItemsQuery = `
                SELECT
                aiOfLocationItem.*,
                i.name as name,
                i.[description] as description,
                i.code as itemCode,
                a.status AS agreementStatus,
                ad.status AS addendumStatus,
                aip.quantity,
                aip.unitTax,
                aip.unitPrice,
                aip.totalPrice,
                aip.totalTax,
                a.contractNumber AS agreementNumber,
                ad.addendumNumber AS addendumNumber,
                i.code as itemCode,
                case
                    WHEN it.name = 'Services' THEN 'services'
                    WHEN it.name = 'Merchandises' THEN 'merchandises'
                    WHEN it.name = 'Fee' THEN 'services'
                    WHEN it.name = 'ECF' THEN 'services'
                END AS itemType
                FROM AgreementLocationItem as aiOfLocationItem
                INNER JOIN AgreementItemPrice aip ON aiOfLocationItem.agreementItemPriceId = aip.id
                INNER JOIN LocationItem as li ON aiOfLocationItem.locationItemId = li.id
                INNER JOIN Item as i ON li.itemId = i.id
                INNER JOIN ItemCategory ic ON ic.id = i.itemCategoryId
                INNER JOIN ItemType it ON it.id = ic.itemTypeId
                INNER JOIN Agreement a ON a.id = aiOfLocationItem.agreementId
                LEFT OUTER JOIN Addendum ad ON ad.id = aiOfLocationItem.addendumId
                WHERE aiOfLocationItem.agreementId = ${this.agreementId} AND aiOfLocationItem.deletedAt IS NULL`
            const agreementItems = await models.sequelize.query(agreementItemsQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })
            return agreementItems
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method return a boolean depending on the count of casket or minimal container items belonging to an agreement
     * @param {array} agreementId
     */
    async agreementCasketOrMinimalContainerCheck (agreementId) {
        try {
            let casketsOrMinimalContainersQuery = `
                SELECT COUNT(AgreementLocationItem.id) AS casketsOrMinimalContainersItemCount
                FROM Agreement
                INNER JOIN AgreementLocationItem ON  AgreementLocationItem.agreementId = Agreement.id
                INNER JOIN LocationItem ON LocationItem.id = AgreementLocationItem.locationItemId
                INNER JOIN Item ON Item.id = LocationItem.itemId
                INNER JOIN ItemCategory ON ItemCategory.id = Item.itemCategoryId
                WHERE ItemCategory.name IN ('Casket','Minimal Container')
                AND AgreementLocationItem.deletedBy IS NULL
                AND AgreementLocationItem.deletedAt IS NULL
                AND Agreement.id IN (:agreementId)
            `

            let outSideCasketQuery = `
                SELECT COUNT(ScheduledFuneralService.id) AS outSideCasektItemCount
                FROM ScheduledFuneralService
                INNER JOIN CasketSection ON CasketSection.id = ScheduledFuneralService.casketSectionId
                LEFT JOIN AgreementLocationItem on AgreementLocationItem.id = ScheduledFuneralService.agreementLocationItemId
                LEFT JOIN AgreementPackageItem ON AgreementPackageItem.id = ScheduledFuneralService.agreementPackageItemId
                LEFT JOIN AgreementPackage ON AgreementPackage.id = AgreementPackageItem.agreementPackageId
                LEFT JOIN AgreementCashAdvancedItem ON AgreementCashAdvancedItem.id = ScheduledFuneralService.agreementCashAdvancedItemId
                INNER JOIN Agreement ON Agreement.id IN (AgreementLocationItem.agreementId, AgreementPackage.agreementId, AgreementCashAdvancedItem.agreementId)
                WHERE CasketSection.isOutSideCasket = 1
                AND ScheduledFuneralService.deletedBy IS NULL
                AND ScheduledFuneralService.deletedAt IS NULL
                AND Agreement.id IN (:agreementId)
            `

            let casketsOrMinimalContainers = await models.sequelize.query(casketsOrMinimalContainersQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId
                }
            })

            let outSideCasket = await models.sequelize.query(outSideCasketQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId
                }
            })

            return (casketsOrMinimalContainers.length || outSideCasket.length) ? (casketsOrMinimalContainers[0].casketsOrMinimalContainersItemCount > 0 || outSideCasket[0].outSideCasektItemCount > 0) : null
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
    /**
     * This method return an array of agreementIds belonging to the same agreement person
     * @param {number} agreementId
     */
    async getAgreementIds (agreementId) {
        try {
            let agreementIdsQuery = `
                SELECT DISTINCT (agreementId)
                FROM AgreementPerson
                WHERE personId IN (
                    SELECT personId
                    FROM AgreementPerson
                    WHERE agreementId =:agreementId
                    AND roleId = 3 -- check for beneficiary
                )
            `

            let agreementIdsArray = await models.sequelize.query(agreementIdsQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId
                }
            })

            let agreementIds = agreementIdsArray.map((item) => item.agreementId)

            return agreementIds
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method return a boolean depending on the count of merchandise items for an agreement of the received item category
     * @param {string} receivedItemCategory
     * @param {*} transaction
     */
    async agreementMerchandiseItems (receivedItemCategory, transaction) {
        try {
            let agreementMerchandiseItemsQuery = `
                SELECT COUNT(AgreementLocationItem.id) AS agreementItemCount
                FROM AgreementLocationItem
                INNER JOIN LocationItem ON LocationItem.id = AgreementLocationItem.locationItemId
                INNER JOIN Item ON Item.id = LocationItem.itemId
                INNER JOIN ItemCategory ON ItemCategory.id = Item.itemCategoryId
                WHERE AgreementLocationItem.agreementId =:agreementId
                AND AgreementLocationItem.deletedAt IS NULL
                AND AgreementLocationItem.deletedBy IS NULL
                AND ItemCategory.name IN (:itemCategoryId)
            `
            let agreementMerchandiseItems = await models.sequelize.query(agreementMerchandiseItemsQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId,
                    itemCategoryId: receivedItemCategory
                },
                transaction
            })

            // If the Property has no Vault items, then no need to display "No Vault Purchased" validation error
            if (receivedItemCategory === 'Vault' && agreementMerchandiseItems.length > 0 && !agreementMerchandiseItems[0].agreementItemCount) {
                const agreementDetails = await models.Agreement.findOne({
                    where: {
                        id: this.agreementId
                    },
                    attributes: ['locationId'],
                    transaction
                })
                const locationId = agreementDetails.locationId

                const itemCategoryDetails = await models.ItemCategory.findOne({
                    where: {
                        name: receivedItemCategory // 'Vault'
                    },
                    attributes: ['id', 'itemTypeId'],
                    transaction
                })
                const itemCategoryId = itemCategoryDetails.id
                const itemTypeId = itemCategoryDetails.itemTypeId

                const itemIndustryDetails = await models.ItemIndustry.findOne({
                    where: {
                        name: 'Cemetery'
                    },
                    attributes: ['id'],
                    transaction
                })
                const itemIndustryId = itemIndustryDetails.id

                const getItems = await ItemController.getItemsByFilter(
                    {
                        locationId,
                        itemCategoryId,
                        itemTypeId,
                        itemIndustryId,
                        agreementId: this.agreementId,
                        offset: 0,
                        limit: 10
                    }
                )
                return getItems.total === 0
            }

            return agreementMerchandiseItems.length > 0 ? agreementMerchandiseItems[0].agreementItemCount > 0 : false
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method return a boolean depending on the count of items for an agreement of the received attribute value names
     * @param {string} receivedAttributeValueNames
     * @param {*} transaction
     */
    async agreementCremationServiceItems (receivedAttributeValueNames, transaction) {
        try {
            let agreementMerchandiseItemsQuery = `
                SELECT COUNT(AgreementLocationItem.id) AS agreementItemCount
                FROM AgreementLocationItem
                INNER JOIN LocationItem ON LocationItem.id = AgreementLocationItem.locationItemId
                INNER JOIN Item ON Item.id = LocationItem.itemId
                INNER JOIN ItemAttributeValue ON Item.id = ItemAttributeValue.itemId
                INNER JOIN AttributeValue ON ItemAttributeValue.attributeValueId = AttributeValue.id
                WHERE AgreementLocationItem.agreementId =:agreementId
                AND AgreementLocationItem.deletedAt IS NULL
                AND AgreementLocationItem.deletedBy IS NULL
                AND AttributeValue.name IN (:receivedAttributeValueNames)
            `
            let agreementMerchandiseItems = await models.sequelize.query(agreementMerchandiseItemsQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId,
                    receivedAttributeValueNames: receivedAttributeValueNames
                },
                transaction
            })

            let agreementPackageItemsQuery = `
                SELECT COUNT(AgreementPackageItem.id) AS agreementItemCount
                FROM AgreementPackage
                INNER JOIN AgreementPackageItem ON AgreementPackageItem.agreementPackageId = AgreementPackage.id
                INNER JOIN LocationItem ON LocationItem.id = AgreementPackageItem.locationItemId
                INNER JOIN Item ON Item.id = LocationItem.itemId
                INNER JOIN ItemAttributeValue ON Item.id = ItemAttributeValue.itemId
                INNER JOIN AttributeValue ON ItemAttributeValue.attributeValueId = AttributeValue.id
                WHERE AgreementPackage.agreementId =:agreementId
                AND AgreementPackage.deletedAt IS NULL
                AND AgreementPackage.deletedBy IS NULL
                AND AttributeValue.name IN (:receivedAttributeValueNames)
            `
            let agreementPackageItems = await models.sequelize.query(agreementPackageItemsQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId,
                    receivedAttributeValueNames: receivedAttributeValueNames
                },
                transaction
            })

            let agreementCashAdvanceItemsQuery = `
                SELECT COUNT(AgreementCashAdvancedItem.locationItemId) AS agreementItemCount
                FROM AgreementCashAdvancedItem
                INNER JOIN LocationItem ON LocationItem.id = AgreementCashAdvancedItem.locationItemId
                INNER JOIN Item ON Item.id = LocationItem.itemId
                INNER JOIN ItemAttributeValue ON Item.id = ItemAttributeValue.itemId
                INNER JOIN AttributeValue ON ItemAttributeValue.attributeValueId = AttributeValue.id
                WHERE AgreementCashAdvancedItem.agreementId =:agreementId
                AND AgreementCashAdvancedItem.deletedAt IS NULL
                AND AgreementCashAdvancedItem.deletedBy IS NULL
                AND AttributeValue.name IN (:receivedAttributeValueNames)
            `
            let agreementCashAdvanceItems = await models.sequelize.query(agreementCashAdvanceItemsQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId,
                    receivedAttributeValueNames: receivedAttributeValueNames
                },
                transaction
            })

            return agreementMerchandiseItems.length > 0 || agreementPackageItems.length > 0 || agreementCashAdvanceItems.length > 0 ? agreementMerchandiseItems[0].agreementItemCount > 0 || agreementPackageItems[0].agreementItemCount > 0 || agreementCashAdvanceItems[0].agreementItemCount > 0 : false
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    async listAllAgreementItems (reqObject) {
        try {
            const agreementId = reqObject.params.agreementId
            const agreementCashAdvancedController = new AgreementCashAdvancedController(agreementId)
            const agreementPackageController = new AgreementPackageController(agreementId)
            const agreementPropertiesController = new PropertyController(agreementId)
            const agreementMemorialController = new AgreementMemorialController(agreementId)
            const addendumController = new AddendumController(agreementId)
            const itemTypes = ['specialOrderItems', 'memorials', 'packages', 'cashAdvancedItems', 'properties']
            let result = await Promise.all([
                this.getAgreementItems(),
                agreementSpecialOrderRequestController.getAgreementSpecialOrderRequest(agreementId),
                agreementMemorialController.getAgreementMemorials(),
                agreementPackageController.getAgreementPackages(),
                agreementCashAdvancedController.getAgreementCashAdvancedItems(),
                agreementPropertiesController.getAgreementProperties()
            ])
            // fetch used items from ItemUsage
            const usedItems = await this.fetchItemUsageItems()
            const responseObject = _.groupBy(result[0], 'itemType')
            result.shift()
            if (reqObject.query && reqObject.query.viewType === 'list') {
                result = result.map(items => {
                    items = _.groupBy(items, ele => {
                        return ele.addendumNumber || ele.agreementNumber || ele.agreementId
                    })
                    return items
                })
                responseObject['services'] = _.groupBy(responseObject['services'], ele => {
                    return ele.addendumNumber || ele.agreementNumber
                })
                responseObject['merchandises'] = _.groupBy(responseObject['merchandises'], ele => {
                    return ele.addendumNumber || ele.agreementNumber
                })
                responseObject['addendums'] = await addendumController.getAllAddendum()
            }
            result.forEach((ele, index) => {
                responseObject[itemTypes[index]] = ele
            })
            responseObject.usedItems = usedItems
            return responseObject
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
    async downloadAgreementInvoice (agreementId, timezone, res) {
        try {
            const AgreementController = require('./agreementController')
            const agreementController = new AgreementController(agreementId)
            const payorController = new PayorController()
            payorController.setResource(agreementId)
            const agreementItemsResponse = await this.listAllAgreementItems({ params: { agreementId } })
            const agreementDetails = await agreementController.getAgreementDetails()
            const agreementPayments = await payorController.getListPayments('success')
            // res.json( {agreementItemsResponse, agreementDetails, agreementPayments })
            const createStatementInvoiceData = await createStatementInvoice(agreementId, agreementItemsResponse, agreementDetails, agreementPayments, { pageSize: 'A4' }, 'statementInvoice', timezone)
            if (createStatementInvoiceData.pdfFile !== '') {
                var stat = fs.statSync(createStatementInvoiceData.pdfFile)
                res.writeHead(200, {
                    'Content-Type': 'application/pdf',
                    'Content-Length': stat.size
                })
                fs.createReadStream(createStatementInvoiceData.pdfFile).pipe(res)
                await unlink(createStatementInvoiceData.pdfFile)
            } else {
                res.status(400).send(new Error('UNABLE_TO_GENERATE_PAYMENT_RECEIPT'))
            }
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    async fetchItemUsageItems (transaction) {
        try {
            const usedItems = await models.sequelize.query(`
            select it.* from ItemUsage it
            left join AgreementProperty ap on ap.id=it.resourceId and it.resourceType='AgreementProperty' and ap.agreementId=${this.agreementId}
            left join AgreementLocationItem ali on ali.id=it.resourceId and it.resourceType='AgreementLocationItem' and ali.agreementId=${this.agreementId}
            left join AgreementMemorialItem ami on ami.id=it.resourceId and it.resourceType='AgreementMemorialItem' and ami.agreementId=${this.agreementId}
            where it.usageStatus=2 and it.deletedAt is null  and it.personId in (select p.id  from AgreementPerson apo
            inner join Person p on p.id=apo.personId
            where apo.agreementId=${this.agreementId} and apo.roleId=3 and isOwner=1
            ) `, { type: models.sequelize.QueryTypes.SELECT, transaction })
            return usedItems
        } catch (err) {
            throw err
        }
    }
}

module.exports = exports = AgreementItemController
