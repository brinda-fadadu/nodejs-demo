const _ = require('lodash')
const moment = require('moment')
const { upsert } = require('../utils')
const models = require('../../../models/index')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const logger = require('../../../lib/logger')
const AgreementItemPriceController = require('./agreementItemPriceController')
const ChangeLogController = require('./changeLog')

class AgreementMemorialController extends AgreementItemPriceController {
    constructor (agreementId) {
        super()
        this.agreementId = agreementId
    }

    /**
     * Gets an agreement memorial if it exists
     * @param {number} memorialId
     * @param {*} transaction
     */
    async getAgreementMemorial (memorialId, transaction) {
        const agreementMemorial = await models.AgreementMemorial.scope('withItems').findOne({
            where: {
                id: memorialId
            },
            transaction
        })
        if (!agreementMemorial) {
            throw new Error('MEMORIAL_NOT_FOUND')
        }
        return agreementMemorial
    }

    /**
     * This method get in-progress addendum on agreement
     */
    async getActiveAddendumOrAgreement (t) {
        const AgreementController = require('./agreementController')
        const agreementController = new AgreementController(this.agreementId)
        const agreement = await agreementController.getAgreementDetails(t)
        if (agreement && agreement.status === 'In progress') {
            return null
        } else {
            const addendum = await models.Addendum.findAll({
                where: {
                    agreementId: this.agreementId
                },
                transaction: t
            })
            if (!addendum.length) {
                throw new Error('AGREEMENT_ALREADY_COMPLETED')
            } else if (addendum && _.find(addendum, { status: 'In progress' })) {
                return _.find(addendum, { status: 'In progress' })
            } else {
                throw new Error('ADDENDUM_ALREADY_COMPLETED')
            }
        }
    }

    /**
     * This method creates or updates a memorial for an agreement
     * @param {string} action action can be add or edit
     * @param {object} payload
     * @param {number} payload.id it is the AgreementMemorialId
     * @param {number} payload.monumentType it is monumentTypeAttributeValueId
     * @param {array} payload.items
     * @param {number} payload.items.locationItemId
     * @param {number} payload.items.itemId
     * @param {string} payload.items.itemType
     *  has id(agreementMemorialId), monumentType(monumentTypeAttributeValueId) and items
     */
    async createOrUpdate (action, payload) {
        let transaction
        const userId = payload.userId
        try {
            const AgreementController = require('./agreementController')
            transaction = await models.sequelize.transaction()
            const agreementController = new AgreementController(this.agreementId)
            await agreementController.getAgreementDetails(transaction)
            if (action === 'edit') {
                await this.checkMemorialItemsUsage(payload.id, transaction)
            }

            let inProgressAddendum = await this.getActiveAddendumOrAgreement()
            inProgressAddendum = _.get(inProgressAddendum, 'id', null)

            // Check if the monument exists
            let agreementMonumentPayload = {
                id: _.get(payload, 'id'),
                agreementId: this.agreementId,
                addendumId: inProgressAddendum,
                memorialTypeAttributeValueId: _.get(payload, 'memorialTypeId')
            }

            let agreementMemorial
            if (_.get(payload, 'id')) {
                agreementMemorial = await models.AgreementMemorial.findOne({
                    where: {
                        id: _.get(payload, 'id')
                    },
                    transaction
                })
            } else {
                // Create or update agreement monument
                agreementMemorial = await upsert('AgreementMemorial', agreementMonumentPayload, transaction, { userId })
            }

            // Add/update items for a memorial
            let memorialItems = _.get(payload, 'items')
            // Check and delete all the items which are changed
            // get all the locationItemId's from the existingMemorialItems
            let existingMemorialsItems = await models.AgreementMemorialItem.scope('notDeleted').findAll({
                attributes: ['id', 'locationItemId', 'addendumId'],
                where: {
                    agreementMemorialId: agreementMemorial.id
                }
            })
            if (existingMemorialsItems && existingMemorialsItems.length) {
                // Filter the ones with out locationItemId not matching
                let differenceItems = _.differenceWith(existingMemorialsItems, memorialItems, (a1, a2) => a1.locationItemId === a2.locationItemId)
                // Delete these items
                await Promise.all(
                    differenceItems.map(async (item) => {
                        await models.AgreementMemorialItem.update({
                            deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                            deletedBy: userId
                        }, {
                            where: {
                                id: item.id
                            }
                        })
                        // Update Change log for remove operation
                        await ChangeLogController.recordBulkDeleteAction('remove', item.id, 'AgreementMemorialItem', transaction)
                    })
                )
            }
            // check if sent locationId's do not match
            await Promise.all(
                memorialItems.map(async (item) => {
                    if (!_.find(existingMemorialsItems, { locationItemId: item.locationItemId })) {
                        const memorialItem = await this.createOrUpdateAgreementMemorialItem(item, agreementMemorial.id, inProgressAddendum, userId, transaction)
                        await agreementController.updateAgreementTotals(userId, transaction)
                        // Update Change log for add operation
                        await ChangeLogController.addOrUpdateAction('add', memorialItem.id, 'AgreementMemorialItem', transaction)
                    }
                })
            )
            // Recalculating the agreement adjustment promocode discounts
            let AdjustmentsController = require('../adjustmentController/discountsAndAdjustmentsHandler')
            const adjController = new AdjustmentsController()
            await adjController.reCalculatePromoCodeDiscounts(this.agreementId, userId, transaction)
            await models.Agreement.updateAndGetTotal(this.agreementId, userId, transaction, payload.addendumId)

            await transaction.commit()
            let agreementMemorialItems = await this.getAgreementMemorialItems(agreementMemorial.id)
            let createdOrUpdatedMonument = {
                id: agreementMemorial.id,
                agreementMemorialItems
            }
            return createdOrUpdatedMonument
        } catch (error) {
            await transaction.rollback()
            throw error
        }
    }

    /**
     * This method is used to update a agreementMemorialItem. This cannot be used for updating item's AgreementItemPrice table.
     * @param {object} item
     * @param {number} item.locationItemId
     * @param {number} agreementMemorialId
     * @param {number} userId
     * @param {*} transaction
     */
    async createOrUpdateAgreementMemorialItem (item, agreementMemorialId, addendumId, userId, transaction) {
        const existingAgreementMemorialItem = await models.AgreementMemorialItem.scope('notDeleted').findOne({
            where: {
                addendumId,
                locationItemId: item.locationItemId,
                agreementMemorialId: agreementMemorialId
            },
            include: [{
                model: models.AgreementItemPrice,
                as: 'agreementItemPrice'
            }]
        })
        const locationItemDetails = await models.LocationItem.findOne({ where: { id: item.locationItemId } })
        const agreementMemorialItemPricePayload = {
            price: Number(locationItemDetails.price).toFixed(2),
            quantity: _.get(existingAgreementMemorialItem, 'agreementItemPrice.quantity', 1),
            agreementItemPriceId: _.get(existingAgreementMemorialItem, 'agreementItemPriceId', null),
            locationItemId: item.locationItemId // To calculate tax value
        }
        const agreementItemPrice = await this.upsertAgreementItemPrice(agreementMemorialItemPricePayload, transaction)
        const agreementMemorialItemPayload = {
            id: _.get(existingAgreementMemorialItem, 'id'),
            agreementMemorialId: agreementMemorialId,
            agreementItemPriceId: _.get(agreementItemPrice, 'id'),
            locationItemId: item.locationItemId,
            addendumId,
            agreementId: this.agreementId
        }
        let agreementMemorialItem = await upsert('AgreementMemorialItem', agreementMemorialItemPayload, transaction, { userId: userId })
        return agreementMemorialItem
    }

    /**
     * This method gets all the items that belong to an agreement memorial
     * @param {*} memorialId
     */
    async getAgreementMemorialItems (memorialId, transaction) {
        // TODO: It's killing me to write 2 queries for this. Will have to find a better way.
        const memorialAddOns = `('Matching Base','Altar Plate','Green Border','Photo', 'Photo Frame','Vase','Incense Pot','Design','2nd Inscription','1st Inscription')`
        let addOnsQuery = `            
        SELECT DISTINCT
        aiOfMemorialItem.id,
        i.id as itemId,
        aiOfMemorialItem.locationItemId,
        i.name as name,
        i.[description] as description,
        i.code as itemCode,
        aip.quantity,
        aip.unitPrice as price,
        aip.totalPrice,
        addendum.addendumNumber,
        addendum.id as addendumId,
        agreement.id as agreementId,
        agreement.contractNumber as agreementNumber,
        CASE 
        WHEN addendum.addendumNumber IS NULL THEN agreement.contractNumber
        ELSE addendum.addendumNumber
        END AS contractNumber,
        av.name as attributeValueName,
        ic.name as itemCategoryName,
        ic.id as itemCategoryId               
        FROM AgreementMemorialItem as aiOfMemorialItem 
        INNER JOIN AgreementItemPrice aip ON aiOfMemorialItem.agreementItemPriceId = aip.id 
        LEFT JOIN Addendum addendum ON aiOfMemorialItem.addendumId = addendum.id
        INNER JOIN Agreement agreement ON aiOfMemorialItem.agreementId = agreement.id
        INNER JOIN LocationItem as li ON aiOfMemorialItem.locationItemId = li.id 
        INNER JOIN Item as i ON li.itemId = i.id
        INNER JOIN ItemCategory ic ON ic.id = i.itemCategoryId 
        INNER JOIN ItemType it ON it.id = ic.itemTypeId
        INNER JOIN ItemAttributeValue as iav ON iav.itemId = i.id
        INNER JOIN AttributeValue as av ON av.id = iav.attributeValueId
        INNER JOIN Attribute ON Attribute.id = av.attributeId                
        WHERE 
                aiOfMemorialItem.agreementMemorialId = ${memorialId} 
            AND
                Attribute.id = (SELECT id FROM Attribute WHERE name = 'Memorial Add On')
            AND
                ic.id = (SELECT id from ItemCategory as icInner WHERE icInner.name = 'Monument Add On')
            AND
                aiOfMemorialItem.deletedAt IS NULL
            AND
                aiOfMemorialItem.deletedAt IS NULL
            AND
                av.name in ${memorialAddOns}    
                `

        const agreementMemorialItemsQuery = `            
        SELECT 
        aiOfMemorialItem.id,
        i.id as itemId,
        aiOfMemorialItem.locationItemId,
        i.name as name,
        i.[description] as description,
        i.code as itemCode,
        aip.quantity,
        aip.unitPrice as price,
        aip.totalPrice,
        addendum.addendumNumber,
        addendum.id as addendumId,
        agreement.id as agreementId,
        agreement.contractNumber as agreementNumber,
        CASE 
        WHEN addendum.addendumNumber IS NULL THEN agreement.contractNumber
        ELSE addendum.addendumNumber
        END AS contractNumber,
        ic.name as itemCategoryName,
        ic.id as itemCategoryId               
        FROM AgreementMemorialItem as aiOfMemorialItem 
        INNER JOIN AgreementItemPrice aip ON aiOfMemorialItem.agreementItemPriceId = aip.id 
        LEFT JOIN Addendum addendum ON aiOfMemorialItem.addendumId = addendum.id
        INNER JOIN Agreement agreement ON aiOfMemorialItem.agreementId = agreement.id
        INNER JOIN LocationItem as li ON aiOfMemorialItem.locationItemId = li.id 
        INNER JOIN Item as i ON li.itemId = i.id
        INNER JOIN ItemCategory ic ON ic.id = i.itemCategoryId           
        WHERE 
                aiOfMemorialItem.agreementMemorialId = ${memorialId}
            AND 
                ic.id IN (SELECT id from ItemCategory as icInner WHERE icInner.name != 'Monument Add On')
            AND
                aiOfMemorialItem.deletedAt IS NULL
            AND
                aiOfMemorialItem.deletedAt IS NULL`

        const agreementMemorialAddOnItems = await models.sequelize.query(addOnsQuery, {
            type: models.sequelize.QueryTypes.SELECT,
            transaction
        })
        const agreementMemorialRemainingItems = await models.sequelize.query(agreementMemorialItemsQuery, {
            type: models.sequelize.QueryTypes.SELECT,
            transaction
        })
        return [ ...agreementMemorialRemainingItems, ...agreementMemorialAddOnItems ]
    }

    /**
     * Method to delete a agreement memorial and it's corresponding items
     * @param {number} memorialId to soft delete agreementMemorial by making changes to deletedBy and deletedAt files
     * @param {number} userId to update updatedBy and deletedBy fields.
     */
    async deleteMemorial (memorialId, addendumId, userId) {
        let transaction
        try {
            const AgreementController = require('./agreementController')
            transaction = await models.sequelize.transaction()
            const agreementController = new AgreementController(this.agreementId)
            await agreementController.getAgreementDetails(transaction)
            await this.checkMemorialItemsUsage(memorialId, transaction)

            const agreementMemorialItems = await models.AgreementMemorialItem.scope('notDeleted').findAll({
                where: { agreementMemorialId: memorialId, addendumId },
                include: [
                    {
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
                                        required: true
                                    }
                                ]
                            }
                        ]
                    }
                ],
                transaction
            })

            const count = await models.AgreementMemorialItem.scope('notDeleted').count({
                where: { agreementMemorialId: memorialId },
                include: [
                    {
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
                                        where: {
                                            name: {
                                                [Op.not]: 'Memorial'
                                            }
                                        },
                                        required: true
                                    }
                                ]
                            }
                        ]
                    }
                ],
                transaction
            })

            let agreementMemorialItemResult = []

            const memorialItems = _.remove(agreementMemorialItems, (item) => _.get(item, 'locationItem.Item.ItemCategory.name') !== 'Memorial')

            if (count !== memorialItems.length) {
                for await (let item of memorialItems) {
                    const result = await models.AgreementMemorialItem.scope('notDeleted').update({
                        deletedBy: userId,
                        deletedAt: moment().format('MM/DD/YYYY HH:mm:ss')
                    }, {
                        where: { id: item.id },
                        transaction
                    })
                    agreementMemorialItemResult.push(result)
                    // Updating change log for deleting memorial items
                    await ChangeLogController.recordBulkDeleteAction('remove', item.id, 'AgreementMemorialItem', transaction)
                }
            } else {
                agreementMemorialItemResult = await models.AgreementMemorialItem.scope('notDeleted').update({
                    deletedBy: userId,
                    deletedAt: moment().format('MM/DD/YYYY HH:mm:ss')
                }, {
                    where: { agreementMemorialId: memorialId, addendumId },
                    transaction
                })
                // Updating change log for deleting memorial items
                for await (let item of agreementMemorialItems) {
                    await ChangeLogController.recordBulkDeleteAction('remove', item.id, 'AgreementMemorialItem', transaction)
                }
                await models.AgreementMemorial.scope('notDeleted').update({
                    deletedBy: userId,
                    deletedAt: moment().format('MM/DD/YYYY HH:mm:ss')
                }, {
                    where: { id: memorialId, agreementId: this.agreementId },
                    transaction
                })
            }

            if ((agreementMemorialItemResult && agreementMemorialItemResult[0] > 0)) {
                // await agreementController.updateAgreementTotals(userId, transaction)
                // Recalculating the agreement adjustment promocode discounts
                let AdjustmentsController = require('../adjustmentController/discountsAndAdjustmentsHandler')
                const adjController = new AdjustmentsController()
                await adjController.reCalculatePromoCodeDiscounts(this.agreementId, userId, transaction)
                await models.Agreement.updateAndGetTotal(this.agreementId, userId, transaction, addendumId)
                await transaction.commit()
                return true
            } else {
                throw new Error('RECORD_NOT_FOUND')
            }
        } catch (err) {
            await transaction.rollback()
            throw err
        }
    }

    /**
     * Method to fetch agreement memorial item
     * @param {number} memorialId
     * @param {number} locationItemId
     * @param {number} addendumId
     * @param {object} transaction
     */
    _fetchAgreementMemorialItem (memorialId, addendumId, locationItemId, transaction) {
        return models.AgreementMemorialItem.scope('notDeleted').findAll({
            include: [
                {
                    model: models.AgreementItemPrice,
                    as: 'agreementItemPrice'
                }
            ],
            limit: 1,
            order: [[ 'createdAt', 'DESC' ]],
            where: {
                agreementMemorialId: memorialId,
                addendumId,
                locationItemId
            },
            transaction
        })
    }

    /**
     * Method to edit the quantity of an item for a particular agreement memorial
     * @param {number} memorialId
     * @param {number} locationItemId
     * @param {number} quantity
     * @param {number} userId
     */
    async editMemorialItemQuantity (memorialId, locationItemId, quantity, addendumId, userId) {
        let transaction
        try {
            const AgreementController = require('./agreementController')
            transaction = await models.sequelize.transaction()

            const agreementController = new AgreementController(this.agreementId)
            await agreementController.getAgreementDetails(transaction)

            let inProgressAddendum = await this.getActiveAddendumOrAgreement()
            inProgressAddendum = _.get(inProgressAddendum, 'id', null)

            let agreementMemorial = await this.getAgreementMemorial(memorialId, transaction)

            let [agreementMemorialItemForAgreement] = await this._fetchAgreementMemorialItem(memorialId, addendumId, locationItemId, transaction)
            let [agreementMemorialItemForAddendum] = await this._fetchAgreementMemorialItem(memorialId, inProgressAddendum, locationItemId, transaction)
            let agreementMemorialItem = agreementMemorialItemForAgreement

            if ((addendumId !== inProgressAddendum) &&
                (quantity - agreementMemorialItemForAgreement.agreementItemPrice.quantity > 0) && agreementMemorialItemForAddendum) {
                // If the quantity is changed from agreement section after addendum is created
                agreementMemorialItem = agreementMemorialItemForAddendum
                quantity = agreementMemorialItemForAddendum.agreementItemPrice.quantity + 1
            }

            if (!agreementMemorialItem) throw new Error('MEMORIAL_ITEM_NOT_FOUND')

            let agreementMemorialItemId = agreementMemorialItem.id
            let agreementItemPriceId = agreementMemorialItem.agreementItemPriceId
            let price = agreementMemorialItem.agreementItemPrice.unitPrice
            let existingQty = agreementMemorialItem.agreementItemPrice.quantity
            let updatedAt = moment().format('MM/DD/YYYY HH:mm:ss')
            let updatedBy = userId

            // Check If Memorial Item is Used
            if (existingQty > quantity) {
                let itemsUsed = await models.ItemUsage.findAll({
                    where: {
                        resourceType: 'AgreementMemorialItem',
                        resourceId: agreementMemorialItemId,
                        deletedAt: null,
                        deletedBy: null
                    },
                    transaction
                })
                if (itemsUsed && itemsUsed.length && itemsUsed.length > quantity) {
                    throw new Error("UNABLE_TO_UPDATE_ITEM'S_QUANTITY")
                }
            }

            // Updating updated at and updated by in AgreementMemorial
            agreementMemorial.set({ id: memorialId, updatedAt, updatedBy })
            await agreementMemorial.save({ transaction })

            if (inProgressAddendum && inProgressAddendum !== _.get(agreementMemorialItem, 'addendumId') && existingQty < quantity) {
                // Create new agreement memorial item with increased quantity
                const locationItemDetails = await models.LocationItem.findOne({ where: { id: locationItemId }, transaction })
                const agreementMemorialItemPricePayload = {
                    price: locationItemDetails.price,
                    quantity: quantity - existingQty,
                    locationItemId // To calculate tax value
                }
                const agreementItemPrice = await this.upsertAgreementItemPrice(agreementMemorialItemPricePayload, transaction)
                const agreementMemorialItemPayload = {
                    agreementMemorialId: memorialId,
                    agreementItemPriceId: _.get(agreementItemPrice, 'id'),
                    locationItemId,
                    addendumId: inProgressAddendum,
                    agreementId: this.agreementId
                }
                let agreementMemorialItem = await upsert('AgreementMemorialItem', agreementMemorialItemPayload, transaction, { userId: userId })
                await ChangeLogController.addOrUpdateAction('add', agreementMemorialItem.id, 'AgreementMemorialItem', transaction)
            } else {
                // Updating updated at and updated by in AgreementMemorialItem
                agreementMemorialItem.set({ id: agreementMemorialItemId, updatedAt, updatedBy })
                await agreementMemorialItem.save({ transaction })

                // Updating the quantity in AgreementItemPrice
                const agreementMemorialItemPricePayload = {
                    price,
                    quantity: quantity,
                    agreementItemPriceId,
                    locationItemId
                }

                await this.upsertAgreementItemPrice(agreementMemorialItemPricePayload, transaction)

                if (quantity === 0) {
                    await models.AgreementMemorialItem.scope('notDeleted').update({
                        deletedBy: userId,
                        deletedAt: moment().format('MM/DD/YYYY HH:mm:ss')
                    }, {
                        where: {
                            agreementMemorialId: memorialId,
                            locationItemId,
                            addendumId: _.get(agreementMemorialItem, 'addendumId')
                        },
                        transaction
                    })
                }
                const action = quantity > existingQty ? 'add' : 'remove'
                await ChangeLogController.addOrUpdateAction(action, agreementMemorialItemId, 'AgreementMemorialItem', transaction)
            }

            // Recalculating the agreement adjustment promocode discounts
            let AdjustmentsController = require('../adjustmentController/discountsAndAdjustmentsHandler')
            const adjController = new AdjustmentsController()
            await adjController.reCalculatePromoCodeDiscounts(this.agreementId, userId, transaction)
            await models.Agreement.updateAndGetTotal(this.agreementId, userId, transaction, addendumId)

            await transaction.commit()

            let agreementMemorialItems = await this.getAgreementMemorialItems(memorialId)

            return agreementMemorialItems
        } catch (err) {
            await transaction.rollback()
            throw err
        }
    }

    /**
     * This method gets all the agreement memorials of a specific memorial type when memorialTypeId is passed
     * This method gets all the agreement memorials for an agreement when the memorialTypeId is not passed
     * @param {*} memorialTypeId
     */
    async getAgreementMemorials (memorialTypeId) {
        try {
            let where = {
                memorialTypeAttributeValueId: memorialTypeId,
                agreementId: this.agreementId
            }

            if (!memorialTypeId) {
                where = {
                    agreementId: this.agreementId
                }
            }
            const AgreementController = require('./agreementController')
            const agreementController = new AgreementController(this.agreementId)
            await agreementController.getAgreementDetails()
            let agreementMemorialsWithoutItem = await models.AgreementMemorial.scope('notDeleted').findAll({
                attributes: ['id', 'createdAt', 'agreementId', 'addendumId'],
                include: [{
                    model: models.AttributeValue,
                    as: 'attributeValue',
                    attributes: ['id', 'name']
                }, {
                    model: models.Agreement,
                    as: 'agreement',
                    attributes: ['contractNumber']
                }, {
                    model: models.Addendum,
                    as: 'addendum',
                    attributes: ['addendumNumber'],
                    required: false
                }],
                where
            })

            let agreementMemorials = []
            await Promise.all(
                agreementMemorialsWithoutItem.map(async (item) => {
                    let memorialItems = await this.getAgreementMemorialItems(item.id)
                    let id = _.get(item, 'attributeValue.id', '')
                    let name = _.get(item, 'attributeValue.name', '')

                    const memorial = _.find(memorialItems, { itemCategoryName: 'Memorial' })
                    const monumentWithoutMemorialItem = _.remove(memorialItems, (item) => item.itemCategoryName !== 'Memorial')

                    if (monumentWithoutMemorialItem.length) {
                        _.map(
                            _.groupBy(monumentWithoutMemorialItem, 'contractNumber'), (itemGrp) => {
                                if (itemGrp.length) {
                                    agreementMemorials.push({
                                        id: item.id,
                                        agreementId: itemGrp[0].agreementId,
                                        addendumId: itemGrp[0].addendumId,
                                        agreementNumber: itemGrp[0].agreementNumber,
                                        addendumNumber: itemGrp[0].addendumNumber,
                                        contractNumber: itemGrp[0].contractNumber,
                                        itemCode: _.get(memorial, 'itemCode'),
                                        itemName: _.get(memorial, 'name'),
                                        createdAt: item.createdAt,
                                        memorialType: {
                                            id,
                                            name
                                        },
                                        items: [
                                            memorial,
                                            ...itemGrp
                                        ]
                                    })
                                }
                            })
                    } else {
                        agreementMemorials.push({
                            id: item.id,
                            agreementId: _.get(memorial, 'agreementId'),
                            addendumId: _.get(memorial, 'addendumId'),
                            agreementNumber: _.get(memorial, 'agreementNumber'),
                            addendumNumber: _.get(memorial, 'addendumNumber'),
                            contractNumber: _.get(memorial, 'contractNumber'),
                            itemCode: _.get(memorial, 'itemCode'),
                            itemName: _.get(memorial, 'name'),
                            createdAt: item.createdAt,
                            memorialType: {
                                id,
                                name
                            },
                            items: [
                                memorial
                            ]
                        })
                    }
                })
            )

            // To return the memorials in a descending order
            agreementMemorials = _.orderBy(agreementMemorials, 'createdAt', 'desc')

            return agreementMemorials
        } catch (error) {
            throw error
        }
    }

    /**
     * This method checks the Memorial Items of a Memorail are used or not
     * If the items are used throws error
     * @param {*} memorialId is the id of Memorial
     * @param {*} transaction
     */
    async checkMemorialItemsUsage (memorialId, transaction) {
        const agreementMemorialItems = await models.AgreementMemorialItem.scope('notDeleted').findAll({
            where: { agreementMemorialId: memorialId },
            transaction
        })
        // Check if Items are Used or not and Delete
        if (agreementMemorialItems && agreementMemorialItems.length) {
            const itemsUsed = await models.ItemUsage.findAll({
                where: {
                    resourceType: 'AgreementMemorialItem',
                    resourceId: { [Op.in]: agreementMemorialItems.map(e => e.id) },
                    deletedAt: null,
                    deletedBy: null
                }
            })
            if (itemsUsed && itemsUsed.length) {
                throw new Error('USED_MEMORIAL_CANNOT_BE_UPDATED_OR_DELETED')
            }
        }
    }

    /**
     * This method returns a boolean depending on the count of the memorials bought for an agreement
     * @param {*} transaction
     */
    async agreementMemorialCheck (transaction) {
        try {
            let agreementMemorialsDetailsQuery = `
                SELECT COUNT(AgreementMemorial.agreementId) AS agreementMemorialsCount
                FROM AgreementMemorial
                WHERE AgreementMemorial.agreementId =:agreementId
                AND AgreementMemorial.deletedAt IS NULL
                AND AgreementMemorial.deletedBy IS NULL
            `
            let agreementMemorialDetails = await models.sequelize.query(agreementMemorialsDetailsQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId
                },
                transaction
            })

            return agreementMemorialDetails.length ? agreementMemorialDetails[0].agreementMemorialsCount > 0 : null
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method returns a boolean depending on the count of the memorials with crypt plate memorial attribute value and memorial item Casket Seal - Crypts
     * @param {*} transaction
     */
    async agreementWithSealCheck (transaction) {
        try {
            let agreementWithSealCountQuery = `
                SELECT SUM(itemQuery.agreementWithSealCount) AS agreementWithSealCount FROM
                (
                    SELECT COUNT(AgreementLocationItem.id) AS agreementWithSealCount
                    FROM AgreementLocationItem
                    INNER JOIN LocationItem ON LocationItem.id = AgreementLocationItem.locationItemId
                    INNER JOIN Item ON Item.id = LocationItem.itemId
                    WHERE Item.name IN ('Casket Seal - Crypts')
                    AND AgreementLocationItem.deletedBy IS NULL
                    AND AgreementLocationItem.agreementId =:agreementId
                    UNION
                    SELECT COUNT(AgreementCashAdvancedItem.id) AS agreementWithSealCount
                    FROM AgreementCashAdvancedItem
                    INNER JOIN LocationItem ON LocationItem.id = AgreementCashAdvancedItem.locationItemId
                    INNER JOIN Item ON Item.id = LocationItem.itemId
                    WHERE Item.name IN ('Casket Seal - Crypts')
                    AND AgreementCashAdvancedItem.deletedBy IS NULL
                    AND AgreementCashAdvancedItem.agreementId =:agreementId
                    UNION
                    SELECT COUNT(AgreementPackageItem.id) AS agreementWithSealCount
                    FROM AgreementPackage
                    INNER JOIN AgreementPackageItem ON AgreementPackageItem.packageId = AgreementPackage.id
                    INNER JOIN LocationItem ON LocationItem.id = AgreementPackageItem.locationItemId
                    INNER JOIN Item ON Item.id = LocationItem.itemId
                    WHERE Item.name IN ('Casket Seal - Crypts')
                    AND AgreementPackage.deletedBy IS NULL
                    AND AgreementPackage.agreementId =:agreementId
                ) AS itemQuery
            `
            let agreementWithSealCount = await models.sequelize.query(agreementWithSealCountQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId
                },
                transaction
            })

            return agreementWithSealCount.length ? agreementWithSealCount[0].agreementWithSealCount > 0 : null
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
}

module.exports = exports = AgreementMemorialController
