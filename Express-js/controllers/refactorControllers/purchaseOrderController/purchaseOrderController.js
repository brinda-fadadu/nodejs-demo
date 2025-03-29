const { upsert } = require('../utils')
const moment = require('moment')
const _ = require('lodash')
const PurchaseOrderItemController = require('./purchaseOrderItemController')
const AgreementItemPriceController = require('../agreementController/agreementItemPriceController')
const models = require('../../../models')
const { docuSignClient } = require('../../../services').docusign
const { purchaseDepartmantInfo } = require('../../../utils/constants')
const { returnFullName } = require('../../../utils/formatters')

class PurchaseOrderController {
    constructor (id) {
        this.id = id
    }

    /**
   * Gets purchase order if it exists
   * @param {number} purchaseOrderId
   */
    static async getPurchaseOrder (purchaseOrderId, transaction) {
        const purchaseOrder = await models.PurchaseOrder.findOne({
            where: {
                id: purchaseOrderId
            },
            transaction
        })
        if (!purchaseOrder) {
            throw new Error('PURCHASE_ORDER_NOT_FOUND')
        }
        return purchaseOrder
    }

    /**
   * Gets item price
   * @param {number} locationItemId
   */
    static async getItemPrice (locationItemId, transaction) {
        const locationItem = await models.LocationItem.findOne({
            where: {
                id: locationItemId
            },
            include: [
                {
                    model: models.Item,
                    attributes: ['cost']
                }
            ],
            transaction
        })
        if (!locationItem) {
            throw new Error('AGREEMENT_LOCATION_ITEM_NOT_FOUND')
        }
        return _.get(locationItem, 'Item.cost', null)
    }

    /**
   * To generate unique purchase order number
   */
    static async generatePurchaseOrderNumber () {
        let date = moment().format('YYYY-MM-DD')
        date = date.replace(/[^\w\s]/gi, '')

        let timeStamp = moment()
            .toDate()
            .getTime()
        timeStamp = timeStamp.toString()
        timeStamp = timeStamp.substr(timeStamp.length - 6)

        let uniquePurchaseOrderNumber = `PO-${date}-${timeStamp}`
        return uniquePurchaseOrderNumber
    }

    /**
   * This method gets purchase order statusId from seed table based on statusName
   * @param {*} statusName Can be ToBeOrdered, InOrder
   * @param {*} transaction
   */
    static async getPurchaseOrderStatusId (statusName, transaction) {
        let statusObj = await models.PurchaseOrderStatus.findOne({
            attributes: ['id'],
            where: {
                name: statusName
            },
            transaction
        })
        if (!statusObj) throw new Error('Error with Seed data')
        return statusObj.id
    }

    /**
   * This method will handle the creation or editing of a purchase order from sheduling
   * @param {*} data
   * @param {*} suppliedTransaction
   * @param {integer} userId
   * @param {*} itemDetails can be urnDetails, casketDetails or vaultDetails
   */
    static async createOrEditPurchaseOrderFromSchedulingHandler (
        data,
        suppliedTransaction,
        userId,
        itemDetails
    ) {
        let transaction = suppliedTransaction
        try {
            if (!suppliedTransaction) {
                transaction = await models.sequelize.transaction()
            }
            let existingItemId =
        itemDetails &&
        (itemDetails.urnId || itemDetails.vaultId || itemDetails.casketId)
            let newItemId = data.urnId || data.vaultId || data.casketId
            let payload = {}
            if (newItemId) {
                const nitemusage = await models.ItemUsage.findOne({
                    where: { id: newItemId },
                    transaction
                })
                const nresourceId = await models[nitemusage.resourceType].findOne({
                    where: { id: nitemusage.resourceId },
                    transaction
                })
                // check agreementMemorialId / agreementLocationItemId based on resourceType
                const nitemType = nitemusage.resourceType === 'AgreementLocationItem' ? 'agreementLocationItemId' : 'agreementMemorialItemId'
                payload = { [nitemType]: nresourceId.id, itemUsageId: nitemusage.id, quantity: 1 }
            }
            if (itemDetails && existingItemId && existingItemId !== newItemId) {
                // delete/update old po
                const itemusage = await models.ItemUsage.findOne({
                    where: { id: existingItemId },
                    transaction
                })
                if (itemusage) {
                    const resourceId = await models[itemusage.resourceType].findOne({
                        where: { id: itemusage.resourceId },
                        transaction
                    })
                    // check agreementMemorialId / agreementLocationItemId based on resourceType
                    const itemType =
          itemusage.resourceType === 'AgreementLocationItem'
              ? 'agreementLocationItemId'
              : 'agreementMemorialItemId'
                    const purchaseOrder = await models.PurchaseOrder.scope(
                        'notDeleted'
                    ).findOne({
                        where: {
                            [itemType]: resourceId.id
                        },
                        transaction
                    })
                    if (purchaseOrder) {
                        // delete
                        const deletePayload = {
                            id: purchaseOrder.id,
                            deletedAt: new Date(),
                            deletedBy: userId
                        }
                        await PurchaseOrderController.deletePurchaseOrder(
                            deletePayload,
                            userId,
                            transaction
                        )
                    }
                }
                if (newItemId) {
                    // creating
                    await PurchaseOrderController.createOrEditPurchaseOrder(
                        payload,
                        { id: userId },
                        transaction
                    )
                }
            }

            // Note: When there is new item id and no existing item id, we create a new purchase order
            if (newItemId && !existingItemId) {
                await PurchaseOrderController.createOrEditPurchaseOrder(
                    payload,
                    { id: userId },
                    transaction
                )
            }
        } catch (error) {
            if (!suppliedTransaction) await transaction.rollback()
            throw error
        }
    }

    /**
   * This method will handle the creation or editing of a purchase order
   * @param {*} req
   * @param {*} suppliedTransaction
   */
    static async createOrEditPurchaseOrderHandler (req, suppliedTransaction) {
        let transaction = suppliedTransaction
        try {
            if (!suppliedTransaction) {
                transaction = await models.sequelize.transaction()
            }
            // Creating purchase order for merchandises and packages
            let agreementLocationItemsQuery = `SELECT AgreementLocationItem.id FROM AgreementLocationItem
            INNER JOIN LocationItem ON AgreementLocationItem.locationItemId = LocationItem.id
            INNER JOIN Item ON Item.id = LocationItem.itemId
            INNER JOIN ItemCategory ON ItemCategory.id = Item.itemCategoryId
            WHERE AgreementLocationItem.agreementId = ${req.params.agreementId}
            AND ItemCategory.itemTypeId IN (SELECT id FROM ItemType WHERE ItemType.name  = 'Merchandises')
            AND AgreementLocationItem.deletedBy IS NULL
            AND AgreementLocationItem.deletedAt IS NULL`
            let agreementLocationItems = await models.sequelize.query(
                agreementLocationItemsQuery,
                {
                    type: models.sequelize.QueryTypes.SELECT,
                    transaction
                }
            )

            let agreementPackageIdsQuery = `SELECT AgreementPackage.id FROM AgreementPackage
            INNER JOIN PackageLocationItem ON PackageLocationItem.packageId = AgreementPackage.packageId
            INNER JOIN LocationItem ON LocationItem.id = PackageLocationItem.locationItemId
            INNER JOIN Item ON Item.id = LocationItem.itemId
            INNER JOIN ItemCategory ON ItemCategory.id = Item.itemCategoryId
            INNER JOIN Location ON Location.id = LocationItem.locationId
            WHERE AgreementPackage.agreementId = ${req.params.agreementId}
            AND ItemCategory.itemTypeId IN (SELECT id FROM ItemType WHERE ItemType.name  = 'Merchandises')
            AND AgreementPackage.deletedBy IS NULL
            AND AgreementPackage.deletedAt IS NULL`

            let agreementPackageIds = await models.sequelize.query(
                agreementPackageIdsQuery,
                {
                    type: models.sequelize.QueryTypes.SELECT,
                    transaction
                }
            )
            // Merchandise Items
            let agreementLocationItemsPayload = await Promise.all(
                agreementLocationItems.map(async items => {
                    let ItemsPurchaseOrderId = await models.PurchaseOrder.scope(
                        'notDeleted'
                    ).findOne({
                        where: {
                            agreementLocationItemId: items.id
                        },
                        transaction
                    })
                    return {
                        agreementLocationItemId: items.id,
                        id: ItemsPurchaseOrderId ? ItemsPurchaseOrderId.id : null
                    }
                })
            )
            // Package Items
            let agreementPackageIdsPayload = await Promise.all(
                agreementPackageIds.map(async agreementPackage => {
                    let packagePurchaseOrderId = await models.PurchaseOrder.scope(
                        'notDeleted'
                    ).findOne({
                        where: {
                            agreementPackageId: agreementPackage.id
                        },
                        transaction
                    })
                    return {
                        agreementPackageId: agreementPackage.id,
                        id: packagePurchaseOrderId ? packagePurchaseOrderId.id : null
                    }
                })
            )
            // Merchandise purchase orders that have to be deleted
            let existingAgreementLocationItems = await models.PurchaseOrder.scope(
                'notDeleted'
            ).findAll({
                include: [
                    {
                        model: models.AgreementLocationItem,
                        as: 'agreementLocationItem',
                        where: {
                            agreementId: req.params.agreementId
                        },
                        paranoid: false
                    }
                ],
                attributes: ['id'],
                transaction
            })
            // Packages purchase orders that have to be deleted
            let existingAgreementPackageItems = await models.PurchaseOrder.scope(
                'notDeleted'
            ).findAll({
                include: [
                    {
                        model: models.AgreementPackage,
                        as: 'agreementPackage',
                        where: {
                            agreementId: req.params.agreementId
                        }
                    }
                ],
                attributes: ['id'],
                transaction
            })
            // Merchandise items in the purchase order
            let existingAgreementLocationItemsIds =
        existingAgreementLocationItems.length &&
        existingAgreementLocationItems.map(
            item => item.agreementLocationItem.id
        )
            // Package items in the purchase order
            let existingAgreementPackageItemsIds =
        existingAgreementPackageItems.length &&
        existingAgreementPackageItems.map(item => item.agreementPackage.id)
            // New merchandise items to be added to the purchase order
            let newAgreementLocationItemsIds = agreementLocationItemsPayload.map(
                item => item.agreementLocationItemId
            )
            // New packages to be added to the purchase order
            let newAgreementPackageItems = agreementPackageIdsPayload.map(
                item => item.agreementPackageId
            )
            // Merchandise items to be deleted
            let deletedAgreementLocationItems = _.difference(
                existingAgreementLocationItemsIds,
                newAgreementLocationItemsIds
            )
            // Packages to be deleted
            let deletedAgreementPackageItems = _.difference(
                existingAgreementPackageItemsIds,
                newAgreementPackageItems
            )
            // Purchase order id of merchandises to be deleted
            let deletedAgreementLocationItemsPurchaseOrderId = await Promise.all(
                deletedAgreementLocationItems.map(async item => {
                    let itemPurchaseOrderId = await models.PurchaseOrder.scope(
                        'notDeleted'
                    ).findOne({
                        where: {
                            agreementLocationItemId: item
                        },
                        transaction
                    })
                    return itemPurchaseOrderId
                })
            )
            // Purchase order id of packages to be deleted
            let deletedAgreementPackageItemsPurchaseOrderId = await Promise.all(
                deletedAgreementPackageItems.map(async item => {
                    let itemPurchaseOrderId = await models.PurchaseOrder.scope(
                        'notDeleted'
                    ).findOne({
                        where: {
                            agreementPackageId: item
                        },
                        transaction
                    })
                    return itemPurchaseOrderId
                })
            )
            // Purchase orders to be deleted
            let purchaseOrdersToBeDeleted = [
                ...deletedAgreementLocationItemsPurchaseOrderId,
                ...deletedAgreementPackageItemsPurchaseOrderId
            ]
            // Deleting purchase orders for merchandises and package
            purchaseOrdersToBeDeleted.length &&
        (await Promise.all(
            purchaseOrdersToBeDeleted.map(async purchaseOrderId => {
                let payload = {}
                payload.id = purchaseOrderId.id
                payload.deletedAt = new Date()
                payload.deletedBy = req.currentUser.id
                await PurchaseOrderController.deletePurchaseOrder(
                    payload,
                    req.currentUser.id,
                    transaction
                )
            })
        ))
            // Merchandise and Packages payload
            let payloads = [
                ...agreementLocationItemsPayload,
                ...agreementPackageIdsPayload
            ]
            // Creating purchase orders for merchandises and package
            if (payloads.length) {
                await Promise.all(
                    payloads.map(async payload => {
                        await PurchaseOrderController.createOrEditPurchaseOrder(
                            payload,
                            req.currentUser,
                            transaction
                        )
                    })
                )
            }
        } catch (error) {
            if (!suppliedTransaction) await transaction.rollback()
            throw error
        }
    }

    /**
   * This method will create or edit a purchase order
   * @param {object} payload
   * @param {integer} payload.agreementLocationItemId
   * @param {integer} payload.agreementPackageId
   * @param {integer} payload.agreementMemorialId
   * @param {integer} payload.agreementCashAdvanceItemId
   * @param {*} user
   */
    static async createOrEditPurchaseOrder (payload, user, suppliedTransaction) {
        let transaction = suppliedTransaction
        try {
            if (!suppliedTransaction) {
                transaction = await models.sequelize.transaction()
            }
            // Create Purchase Order when the purchaseOrderId does not exist, else update the purchase order
            let purchaseOrderPayload = payload
            // if (!payload.id) {
            //     // generating a purchase order number
            //     let purchaseOrderNumber = await PurchaseOrderController.generatePurchaseOrderNumber()
            //     purchaseOrderPayload['purchaseOrderNumber'] = purchaseOrderNumber
            // }

            // Creating a purchase order number if there is no id in the payload else updating the purchase order
            let purchaseOrder = await upsert(
                'PurchaseOrder',
                purchaseOrderPayload,
                transaction,
                { userId: user.id }
            )

            let items = []

            if (payload.agreementLocationItemId) {
                let itemQuery = `SELECT AgreementLocationItem.locationItemId, AgreementItemPrice.quantity, Item.cost as unitPrice, AgreementItemPrice.unitTax
                FROM AgreementLocationItem
                INNER JOIN AgreementItemPrice ON AgreementItemPrice.id = AgreementLocationItem.agreementItemPriceId
                INNER JOIN LocationItem on LocationItem.id= AgreementLocationItem.locationItemId
                INNER JOIN ITEM ON ITEM.id=LocationItem.itemId
                WHERE AgreementLocationItem.id = ${payload.agreementLocationItemId}`

                items = await models.sequelize.query(itemQuery, {
                    type: models.sequelize.QueryTypes.SELECT,
                    transaction
                })
            }

            if (payload.agreementPackageId) {
                let itemQuery = `SELECT PackageLocationItem.locationItemId, PackageLocationItem.quantity, Item.cost as unitPrice, ((Item.cost * Location.tax)/100) AS unitTax FROM AgreementPackage
                INNER JOIN PackageLocationItem ON PackageLocationItem.packageId = AgreementPackage.packageId
                INNER JOIN LocationItem ON LocationItem.id = PackageLocationItem.locationItemId
                INNER JOIN Item ON Item.id = LocationItem.itemId
                INNER JOIN ItemCategory ON ItemCategory.id = Item.itemCategoryId
                INNER JOIN Location ON Location.id = LocationItem.locationId
                WHERE AgreementPackage.id = ${payload.agreementPackageId}
                AND ItemCategory.itemTypeId IN (SELECT id FROM ItemType WHERE ItemType.name  = 'Merchandises')`

                items = await models.sequelize.query(itemQuery, {
                    type: models.sequelize.QueryTypes.SELECT,
                    transaction
                })
            }

            if (payload.agreementMemorialId) {
                let extrasItemQuery = `SELECT AgreementMemorialItem.locationItemId, ItemUsage.id AS agreementMemorialItemUsageId, AgreementMemorialItem.id as resourceId, AgreementItemPrice.quantity, Item.cost as unitPrice, AgreementItemPrice.unitTax FROM AgreementMemorial
                INNER JOIN AgreementMemorialItem ON AgreementMemorialItem.agreementMemorialId = AgreementMemorial.id
                LEFT JOIN ItemUsage ON ItemUsage.resourceId = AgreementMemorialItem.id AND ItemUsage.resourceType = 'AgreementMemorialItem'
                INNER JOIN LocationItem ON LocationItem.id = AgreementMemorialItem.locationItemId
                INNER JOIN AgreementItemPrice ON AgreementItemPrice.id = AgreementMemorialItem.agreementItemPriceId
                INNER JOIN Item ON Item.id = LocationItem.itemId
                INNER JOIN ItemCategory ON ItemCategory.id = Item.itemCategoryId
                WHERE ItemCategory.name in ('Monument Add On') and AgreementMemorial.id=${payload.agreementMemorialId} and  AgreementMemorialItem.id=${payload.agreementMemorialItemId}
                AND ItemUsage.id IN (${payload.itemUsageIds})`

                const extraItems = await models.sequelize.query(extrasItemQuery, {
                    type: models.sequelize.QueryTypes.SELECT,
                    transaction
                })
                let memorialItems = []
                if (!extraItems.length) {
                    let itemQuery = `SELECT  AgreementMemorialItem.locationItemId, ItemUsage.id AS agreementMemorialItemUsageId, AgreementItemPrice.quantity,AgreementMemorialItem.id as resourceId,
                    Item.cost as unitPrice, ((Item.cost * Location.tax)/100) AS unitTax  FROM AgreementMemorial
                    INNER JOIN AgreementMemorialItem ON AgreementMemorialItem.agreementMemorialId = AgreementMemorial.id
                    LEFT JOIN ItemUsage ON ItemUsage.resourceId = AgreementMemorialItem.id AND ItemUsage.resourceType = 'AgreementMemorialItem'
                    INNER JOIN AgreementItemPrice ON AgreementItemPrice.id = AgreementMemorialItem.agreementItemPriceId
                    INNER JOIN LocationItem ON LocationItem.id = AgreementMemorialItem.locationItemId
                    INNER JOIN Item ON Item.id = LocationItem.itemId
                    INNER JOIN ItemCategory ON ItemCategory.id = Item.itemCategoryId
                    INNER JOIN Location ON Location.id = LocationItem.locationId
                    WHERE ItemCategory.name not in ('Monument Add On') and AgreementMemorial.id=${payload.agreementMemorialId}
                    AND ItemUsage.id IN (${payload.itemUsageIds})`

                    memorialItems = await models.sequelize.query(itemQuery, {
                        type: models.sequelize.QueryTypes.SELECT,
                        transaction
                    })
                }
                items = [...extraItems, ...memorialItems]
            }

            // creating purchase order items for the purchase order
            await Promise.all(
                items.map(async item => {
                    let { quantity, unitPrice, locationItemId, unitTax } = item
                    let existingItem = await models.PurchaseOrderItem.scope(
                        'notDeleted'
                    ).findOne({
                        where: {
                            locationItemId,
                            purchaseOrderId: purchaseOrder.id
                        },
                        transaction
                    })
                    let itemStatusId = _.get(existingItem, 'statusId')
                    if (!itemStatusId) {
                        itemStatusId = await this.getPurchaseOrderStatusId(
                            'ToBeOrdered',
                            transaction
                        )
                    }

                    let itemPayload = {
                        id: _.get(existingItem, 'id'),
                        purchaseOrderId: purchaseOrder.id,
                        quantity: payload.quantity ? payload.quantity : quantity,
                        unitPrice,
                        locationItemId,
                        unitTax,
                        statusId: itemStatusId
                    }
                    if (!payload.id) {
                        // generating a purchase order number
                        let purchaseOrderNumber = await PurchaseOrderController.generatePurchaseOrderNumber()
                        itemPayload['purchaseOrderNumber'] = purchaseOrderNumber
                    }

                    // The current quantity of the purchase order item quantity before making the update
                    let currentPurchaseOrderItem

                    if (existingItem) {
                        currentPurchaseOrderItem = await models.PurchaseOrderItem.findOne({
                            where: {
                                id: existingItem.id
                            },
                            include: [
                                {
                                    model: models.CaseInfoForm,
                                    as: 'caseInfoForm'
                                }
                            ],
                            transaction
                        })
                    }

                    // let onOrderStatusId = await PurchaseOrderController.getPurchaseOrderStatusId(
                    //     'OnOrder',
                    //     transaction
                    // )
                    // let receivedStatusId = await PurchaseOrderController.getPurchaseOrderStatusId(
                    //     'Received',
                    //     transaction
                    // )
                    let tobeOrderedStatusId = await PurchaseOrderController.getPurchaseOrderStatusId(
                        'ToBeOrdered',
                        transaction
                    )

                    // Triggering the email notification only when there is a change in the quantity
                    if (
                        existingItem &&
            currentPurchaseOrderItem.quantity !== itemPayload.quantity
                    ) {
                        // Triggering the void document when the quantity is changed for an on order or received purchase order
                        if (currentPurchaseOrderItem.statusId === tobeOrderedStatusId) {
                            await PurchaseOrderController.purchaseOrderEmailNotification(
                                itemPayload.statusId,
                                itemPayload.id,
                                {
                                    name: 'modified quantity',
                                    modifiedQuantity: itemPayload.quantity
                                },
                                transaction
                            )
                        }
                        //             if (
                        //                 currentPurchaseOrderItem.statusId === onOrderStatusId ||
                        //   currentPurchaseOrderItem.statusId === receivedStatusId
                        //             ) {
                        //                 if (
                        //                     currentPurchaseOrderItem.caseInfoForm &&
                        //     currentPurchaseOrderItem.caseInfoForm.status !== 'voided'
                        //                 ) {
                        //                     const FormsController = require('../formsController/formsController')

                        //                     await FormsController.voidCaseInfoForm(
                        //                         currentPurchaseOrderItem.caseInfoForm.id,
                        //                         null,
                        //                         transaction,
                        //                         { isPersonIdNeeded: false }
                        //                     )
                        //                     await models.PurchaseOrderItem.update(
                        //                         {
                        //                             caseInfoFormId: null
                        //                         },
                        //                         {
                        //                             where: { id: itemPayload.id }
                        //                         }
                        //                     )
                        //                 }
                        //             }
                    }

                    if (
                        existingItem &&
            currentPurchaseOrderItem.statusId !== tobeOrderedStatusId
                    ) {
                        itemPayload['quantity'] = currentPurchaseOrderItem.quantity
                    }
                    if (payload.agreementMemorialId) {
                        if (item.agreementMemorialItemUsageId) {
                            itemPayload['itemUsageId'] = item.agreementMemorialItemUsageId
                        }
                    }
                    if (payload.itemUsageId) {
                        itemPayload['itemUsageId'] = payload.itemUsageId
                    }
                    let createdPurchaseOrderItem = await PurchaseOrderItemController.createOrEditPurchaseOrderItem(
                        itemPayload,
                        user.id,
                        transaction
                    )
                    if (!existingItem) {
                        await PurchaseOrderController.purchaseOrderEmailNotification(
                            createdPurchaseOrderItem.statusId,
                            createdPurchaseOrderItem.id,
                            { name: '' },
                            transaction
                        )
                    }

                    if (!suppliedTransaction) await transaction.commit()
                })
            )
            return
        } catch (error) {
            if (!suppliedTransaction) await transaction.rollback()
            throw error
        }
    }

    /**
   * Updates the Purchase order Item of a purchase order
   * @param {*} payload
   * @param {*} payload.id PurchaseOrderId
   * @param {*} payload.item.id purchaseOrderItemId
   * @param {*} payload.item.unitPrice
   * @param {*} payload.item.quantity
   * @param {*} payload.item.shippingCost
   * @param {*} payload.item.orderDenyReason
   * @param {*} payload.item.orderDate
   * @param {*} payload.item.expectedDeliveryDate
   * @param {*} payload.item.receivedDate
   * @param {*} payload.item.receivingDocumentNumber
   * @param {*} payload.item.orderStatus Received/Shortage
   * @param {*} userId
   */
    async updatePurchaseOrder (payload, userId) {
        let transaction
        try {
            transaction = await models.sequelize.transaction()
            await PurchaseOrderController.getPurchaseOrder(this.id, transaction)
            let statusId
            let orderDenyReasonId = null
            let denyReason = _.get(payload, 'item.orderDenyReason')
            if (denyReason) {
                let orderDenyReason = await PurchaseOrderController.getPurchaseOrderDenyReason(
                    denyReason,
                    transaction
                )
                orderDenyReasonId = orderDenyReason[0].id
                if (orderDenyReason[0].name === 'Pull From Inventory') {
                    statusId = await PurchaseOrderController.getPurchaseOrderStatusId(
                        'Received',
                        transaction
                    )
                } else {
                    statusId = await PurchaseOrderController.getPurchaseOrderStatusId(
                        'Invalid',
                        transaction
                    )
                }
            } else {
                statusId = await PurchaseOrderController.getPurchaseOrderStatusId(
                    'OnOrder',
                    transaction
                )
                if (_.get(payload, 'item.receivedDate')) {
                    statusId = await PurchaseOrderController.getPurchaseOrderStatusId(
                        'Received',
                        transaction
                    )
                }
            }
            let orderStatusId = null
            if (_.get(payload, 'item.orderStatus')) {
                let orderStatuses = await PurchaseOrderController.getOrderStatus(
                    _.get(payload, 'item.orderStatus'),
                    transaction
                )
                orderStatusId = orderStatuses[0].id
            }
            let itemPayload = {
                id: _.get(payload, 'item.id'),
                unitPrice: _.get(payload, 'item.price'),
                quantity: _.get(payload, 'item.quantity'),
                shippingCost: _.get(payload, 'item.shippingCost'),
                statusId,
                orderDenyReasonId,
                orderDate: _.get(payload, 'item.orderDate', null),
                expectedDeliveryDate: _.get(payload, 'item.expectedDeliveryDate', null),
                receivedDate: _.get(payload, 'item.receivedDate', null),
                receivingDocumentNumber: _.get(payload, 'item.receivingDocumentNumber', null),
                orderStatusId
            }

            let invalidStatusId = await PurchaseOrderController.getPurchaseOrderStatusId(
                'Invalid',
                transaction
            )
            let receivedStatusId = await PurchaseOrderController.getPurchaseOrderStatusId(
                'Received',
                transaction
            )
            let onOrderStatusId = await PurchaseOrderController.getPurchaseOrderStatusId(
                'OnOrder',
                transaction
            )

            let purchaseOrderItemDetail = await models.PurchaseOrderItem.scope('withCaseInfoForm').findOne({
                where: {
                    id: payload.item.id
                },
                transaction
            })
            const FormsController = require('../formsController/formsController')

            if (itemPayload.statusId === invalidStatusId) {
                if (
                    purchaseOrderItemDetail.caseInfoForm && purchaseOrderItemDetail.caseInfoForm.envelopeId && purchaseOrderItemDetail.caseInfoForm.status.toLowerCase() !== 'voided') {
                    await FormsController.voidCaseInfoForm(
                        purchaseOrderItemDetail.caseInfoForm.id,
                        null,
                        transaction,
                        { isPersonIdNeeded: false }
                    )
                }
            }

            let purchaseOrderItem = await PurchaseOrderItemController.createOrEditPurchaseOrderItem(
                itemPayload,
                userId,
                transaction
            )

            // Triggering the void document when the quantity is changed for an on order or received purchase order
            if (itemPayload.quantity && purchaseOrderItemDetail.quantity !== Number(itemPayload.quantity) && (purchaseOrderItemDetail.statusId === onOrderStatusId || purchaseOrderItemDetail.statusId === receivedStatusId)) {
                await PurchaseOrderController.purchaseOrderEmailNotification(
                    itemPayload.statusId,
                    itemPayload.id,
                    {
                        name: 'modified quantity',
                        modifiedQuantity: itemPayload.quantity
                    },
                    transaction
                )
                if (purchaseOrderItemDetail.caseInfoForm && purchaseOrderItemDetail.caseInfoForm.status.toLowerCase() !== 'voided') {
                    await FormsController.voidCaseInfoForm(
                        purchaseOrderItemDetail.caseInfoForm.id,
                        null,
                        transaction,
                        { isPersonIdNeeded: false }
                    )
                    await models.PurchaseOrderItem.update(
                        {
                            caseInfoFormId: null
                        },
                        {
                            where: { id: itemPayload.id },
                            transaction
                        }
                    )
                }
            } else if (itemPayload.statusId !== purchaseOrderItemDetail.statusId) {
                await PurchaseOrderController.purchaseOrderEmailNotification(
                    itemPayload.statusId,
                    itemPayload.id,
                    { name: '' },
                    transaction
                )
            }

            if (orderDenyReasonId === 1) {
                let timezone = _.get(payload, 'timezone')
                await PurchaseOrderController.purchaseOrderEmailNotification(
                    itemPayload.statusId,
                    itemPayload.id,
                    { name: 'pullFromInventory', timezone: timezone },
                    transaction
                )
            }

            // Changing the status of the itemusage to used when the purchase order is received
            // Only cemetery service purchase order items will have itemUsageId
            if (
                purchaseOrderItem.statusId === receivedStatusId &&
        purchaseOrderItem.itemUsageId
            ) {
                let statusId = await models.ItemUsageStatus.findOne({
                    where: { status: 'Used' }
                })
                // Updating the status of the itemUsage to used
                await models.ItemUsage.update(
                    {
                        usageStatus: statusId.id
                    },
                    {
                        where: { id: purchaseOrderItem.itemUsageId },
                        transaction
                    }
                )
            }
            await transaction.commit()
            return purchaseOrderItem
        } catch (error) {
            if (transaction) await transaction.rollback()
            throw error
        }
    }

    /**
   * This method will delete a purchase order and it's corresponding purchase order items
   * @param {object} payload
   * @param {integer} userId
   */
    static async deletePurchaseOrder (payload, userId, transaction) {
        try {
            // Check if the purchase order exists
            await PurchaseOrderController.getPurchaseOrder(payload.id, transaction)
            let itemQuery = `SELECT PurchaseOrderItem.locationItemId, PurchaseOrderItem.statusId FROM PurchaseOrderItem
            WHERE PurchaseOrderItem.purchaseOrderId = ${payload.id}`
            let items = await models.sequelize.query(itemQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                transaction
            })
            let tobeOrderedStatusId = await PurchaseOrderController.getPurchaseOrderStatusId('ToBeOrdered', transaction)
            let purchaseOrder = payload
            // Note: If the status of every purchaseOrderItem is toBeOrderStatusId then delete the Purchase Order
            let itemStatusCheck = items.every(item => item.statusId === tobeOrderedStatusId)
            if (items.length && itemStatusCheck) {
                purchaseOrder = await upsert('PurchaseOrder', payload, transaction, { userId })
            }
            if (_.get(items, 'length')) {
                await Promise.all(
                    items.map(async item => {
                        // Note: Delete the  purchase order item only if it's status is tobeordered otherwise don't delete it
                        if (item.statusId === tobeOrderedStatusId) {
                            let itemInfo = await models.PurchaseOrderItem.scope(
                                'notDeleted'
                            ).findOne({
                                where: {
                                    locationItemId: item.locationItemId,
                                    purchaseOrderId: purchaseOrder.id
                                },
                                transaction
                            })
                            if (!itemInfo) {
                                throw new Error('PURCHASE_ORDER_ITEM_NOT_FOUND')
                            }
                            let deleteItemPayload = {
                                id: itemInfo.id,
                                quantity: 0,
                                deletedAt: new Date(),
                                deletedBy: userId,
                                purchaseOrderId: purchaseOrder.id
                            }
                            let purchaseOrderItemDetail = await models.PurchaseOrderItem.findOne(
                                {
                                    where: {
                                        id: deleteItemPayload.id
                                    },
                                    include: [
                                        {
                                            model: models.CaseInfoForm,
                                            as: 'caseInfoForm'
                                        }
                                    ],
                                    transaction
                                }
                            )
                            const FormsController = require('../formsController/formsController')

                            if (purchaseOrderItemDetail.caseInfoForm && purchaseOrderItemDetail.caseInfoForm.envelopeId) {
                                await FormsController.voidCaseInfoForm(
                                    purchaseOrderItemDetail.caseInfoForm.id,
                                    null,
                                    transaction,
                                    { isPersonIdNeeded: false }
                                )
                            }
                            await PurchaseOrderItemController.deletePurchaseOrderItem(
                                deleteItemPayload,
                                userId,
                                transaction
                            )
                            await PurchaseOrderController.purchaseOrderEmailNotification(
                                purchaseOrderItemDetail.statusId,
                                deleteItemPayload.id,
                                { name: 'Item Deleted' },
                                transaction
                            )
                        }
                    }))
                return
            }
            return
        } catch (error) {
            throw error
        }
    }

    /**
   * This function gets all the purchase orders based on Filters.
   * @param {string} status EX: ToBeOrdered, OnOrder, Received, Invalid
   * @param {object} filters
   * @param {integer} filters.page default = 0
   * @param {integer} filters.limit default= 10
   * @param {string} filters.searchTerm
   * @param {string} filter.order must be ASC/DESC
   */
    static async getListOfPurchaseOrders (status = 'ToBeOrdered', filters = {}) {
        try {
            let { page = 1, limit = 10, order = 'DESC', searchTerm } = filters

            page = (page - 1) * limit

            let statusObj = await models.PurchaseOrderStatus.findOne({
                where: {
                    name: status
                }
            })

            let searchQuery = ''

            if (searchTerm) {
                // PO.purchaseOrderNumber LIKE '%${searchTerm}%' OR
                searchQuery = `
                AND(
                    purchaseOrderNumber LIKE '%${searchTerm}%' OR
                    contractNumber LIKE '%${searchTerm}%' OR 
                    addendumNumber LIKE '%${searchTerm}%' OR 
                    Item.code LIKE '%${searchTerm}%' OR
                    Item.name LIKE '%${searchTerm}%')`
            }

            // let statusQuery = `AND PurchaseOrderItem.statusId = (SELECT PurchaseOrderStatus.id FROM PurchaseOrderStatus WHERE PurchaseOrderStatus.name IN ${statuses})`
            let purchaseOrderPrimaryQuery = `
            FROM PurchaseOrder as PO
            INNER JOIN PurchaseOrderItem ON PurchaseOrderItem.purchaseOrderId = PO.id
            INNER JOIN LocationItem ON LocationItem.id = (CASE WHEN PurchaseOrderItem.replacedLocationItemId IS NULL THEN PurchaseOrderItem.locationItemId ELSE PurchaseOrderItem.replacedLocationItemId END)
            INNER JOIN Item ON Item.id = LocationItem.itemId
            INNER JOIN ItemCategory on ItemCategory.id = Item.itemCategoryId
            LEFT JOIN AgreementLocationItem ON AgreementLocationItem.id = PO.agreementLocationItemId
            LEFT JOIN AgreementPackage ON AgreementPackage.id = PO.agreementPackageId
            LEFT JOIN AgreementMemorial on AgreementMemorial.id = PO.agreementMemorialId AND ItemCategory.name in ('Monument Add On','Memorial')
            INNER JOIN Agreement ON (Agreement.id = AgreementLocationItem.agreementId OR Agreement.id = AgreementPackage.agreementId OR Agreement.id = AgreementMemorial.agreementId)
            INNER JOIN AgreementType ON AgreementType.id = Agreement.Type
            LEFT JOIN Addendum  ON (Addendum.id =  AgreementLocationItem.addendumId OR Addendum.id =  AgreementPackage.addendumId OR Addendum.id = AgreementMemorial.addendumId)
            INNER JOIN Location as agl ON agl.id = Agreement.locationId
            WHERE PO.deletedAt IS NULL AND PO.deletedBy IS NULL 
            AND ((select MIN(statusId) as status from PurchaseOrderItem  where purchaseOrderId= PO.id) = ${statusObj.id})
            ${searchQuery}
            `
            // let unionQuery = `SELECT PurchaseOrder.id, PurchaseOrder.createdAt, PurchaseOrder.agreementLocationItemId,PurchaseOrder.agreementMemorialId, PurchaseOrderItem.purchaseOrderNumber, PurchaseOrder.agreementPackageId, Agreement.contractNumber, Addendum.addendumNumber, AgreementType.agreementType, Item.name as name, Item.code as code, agl.name as location, Agreement.id as agreementId FROM PurchaseOrder
            // INNER JOIN PurchaseOrderItem ON PurchaseOrderItem.purchaseOrderId = PurchaseOrder.id
            // INNER JOIN LocationItem ON (LocationItem.id = PurchaseOrderItem.locationItemId AND PurchaseOrderItem.replacedLocationItemId IS NULL) OR (LocationItem.id = PurchaseOrderItem.replacedLocationItemId)
            // INNER JOIN Item ON Item.id = LocationItem.itemId
            // INNER JOIN AgreementLocationItem ON AgreementLocationItem.id = PurchaseOrder.agreementLocationItemId
            // INNER JOIN Agreement ON Agreement.id = AgreementLocationItem.agreementId
            // INNER JOIN AgreementType ON AgreementType.id = Agreement.Type
            // LEFT JOIN Addendum on Addendum.id in (AgreementLocationItem.addendumId)
            // INNER JOIN Location as agl ON agl.id = Agreement.locationId
            // WHERE PurchaseOrder.deletedAt IS NULL AND PurchaseOrder.deletedBy IS NULL ${statusQuery}
            // UNION
            // SELECT PurchaseOrder.id, PurchaseOrder.createdAt, PurchaseOrder.agreementLocationItemId,PurchaseOrder.agreementMemorialId, PurchaseOrderItem.purchaseOrderNumber, PurchaseOrder.agreementPackageId, Agreement.contractNumber, Addendum.addendumNumber, AgreementType.agreementType, Package.name, Package.code, agl.name as location, Agreement.id as agreementId FROM PurchaseOrder
            // INNER JOIN PurchaseOrderItem ON PurchaseOrderItem.purchaseOrderId = PurchaseOrder.id
            // INNER JOIN LocationItem ON (LocationItem.id = PurchaseOrderItem.locationItemId AND PurchaseOrderItem.replacedLocationItemId IS NULL) OR (LocationItem.id = PurchaseOrderItem.replacedLocationItemId)
            // INNER JOIN Item ON Item.id = LocationItem.itemId
            // INNER JOIN AgreementPackage ON AgreementPackage.id = PurchaseOrder.agreementPackageId
            // INNER JOIN Package ON Package.id = AgreementPackage.packageId
            // INNER JOIN Agreement ON Agreement.id = AgreementPackage.agreementId
            // LEFT JOIN Addendum on Addendum.id in (AgreementPackage.addendumId)
            // INNER JOIN AgreementType ON AgreementType.id = Agreement.Type
            // INNER JOIN Location as agl ON agl.id = Agreement.locationId
            // WHERE PurchaseOrder.deletedAt IS NULL AND PurchaseOrder.deletedBy IS NULL ${statusQuery}
            // UNION
            // SELECT PurchaseOrder.id, PurchaseOrder.createdAt, PurchaseOrder.agreementLocationItemId, PurchaseOrder.agreementMemorialId,
            // PurchaseOrderItem.purchaseOrderNumber, PurchaseOrder.agreementPackageId, Agreement.contractNumber,
            // Addendum.addendumNumber, AgreementType.agreementType, replacedItem.name as name, replacedItem.code as code, agl.name as location, Agreement.id as agreementId FROM
            // PurchaseOrder
            // INNER JOIN PurchaseOrderItem ON PurchaseOrderItem.purchaseOrderId = PurchaseOrder.id
            // INNER JOIN LocationItem as existingLocationItem ON existingLocationItem.id = PurchaseOrderItem.locationItemId
            // INNER JOIN Item as existingItem ON existingItem.id = existingLocationItem.itemId
            // INNER JOIN ItemCategory as existingItemCategory ON existingItemCategory.id = existingItem.itemCategoryId
            // INNER JOIN LocationItem as replacedLocationItem ON (PurchaseOrderItem.replacedLocationItemId IS NULL AND replacedLocationItem.id = PurchaseOrderItem.locationItemId) OR (replacedLocationItem.id = PurchaseOrderItem.replacedLocationItemId)
            // INNER JOIN Item as replacedItem ON replacedItem.id = replacedLocationItem.itemId
            // INNER JOIN ItemCategory as replacedItemCategory ON replacedItemCategory.id = replacedItem.itemCategoryId
            // INNER JOIN AgreementMemorial on AgreementMemorial.id = PurchaseOrder.agreementMemorialId
            // INNER JOIN Agreement ON Agreement.id = AgreementMemorial.agreementId
            // LEFT JOIN Addendum on Addendum.id in (AgreementMemorial.addendumId)
            // INNER JOIN AgreementType ON AgreementType.id = Agreement.Type
            // INNER JOIN Location as agl ON agl.id = Agreement.locationId
            // WHERE PurchaseOrder.deletedAt IS NULL AND PurchaseOrder.deletedBy IS NULL AND existingItemCategory.name in ('Monument Add On','Memorial')
            // AND ((select MIN(statusId) as status from PurchaseOrderItem  where purchaseOrderId= PurchaseOrder.id) =( SELECT PurchaseOrderStatus.id FROM PurchaseOrderStatus WHERE PurchaseOrderStatus.name IN ${statuses}))`

            // let purchaseOrderPrimaryQuery = `FROM ${unionQuery}
            // ${searchQuery}`
            // let groupByQuery = `GROUP BY PO.id, PO.createdAt,PO.agreementId, PO.agreementLocationItemId, PO.agreementPackageId,PO.agreementMemorialId, PO.contractNumber,addendumNumber, PO.agreementType, PO.name, PO.code, PO.location`

            let orderByQuery = `ORDER BY PO.createdAt ${order}`
            let paginationQuery = `OFFSET ${page} ROWS FETCH  NEXT ${limit} ROWS ONLY`

            let purchaseOrderQuery = `SELECT PO.id, PO.createdAt, agreementLocationItemId, agreementPackageId, agreementMemorialId, Agreement.id as agreementId, contractNumber, addendumNumber, Addendum.id as addendumId, agreementType, agl.name as location, Item.code as code, Item.name as name ${purchaseOrderPrimaryQuery} ${orderByQuery} ${paginationQuery}`
            // let purchaseOrderQuery = `SELECT PO.id, PO.createdAt, PO.agreementId, PO.agreementLocationItemId, PO.agreementPackageId,PO.agreementMemorialId, PO.contractNumber,addendumNumber, PO.agreementType, PO.name, PO.code, PO.location ${purchaseOrderPrimaryQuery} ${orderByQuery} ${paginationQuery}`

            const purchaseOrders = await models.sequelize.query(purchaseOrderQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })

            // TODO: Ved to improve this query
            await Promise.all(
                purchaseOrders.map(async (purchaseOrder, index) => {
                    let hmisContractSyncData, hmisSyncTable, where
                    if (purchaseOrder.agreementId && !purchaseOrder.addendumId) {
                        hmisSyncTable = 'HMISDataSync'
                        where = {
                            agreementId: purchaseOrder.agreementId
                        }
                    } else if (purchaseOrder.agreementId && purchaseOrder.addendumId) {
                        hmisSyncTable = 'HMISAddendumDataSync'
                        where = {
                            addendumId: purchaseOrder.addendumId
                        }
                    }

                    hmisContractSyncData = await models[hmisSyncTable].findOne({
                        where: where
                    })
                    purchaseOrder.hmisContractSyncDate = _.get(hmisContractSyncData, 'statusId') === 3 ? _.get(hmisContractSyncData, 'updatedAt', null) : null

                    let conditionalQuery = `INNER JOIN AgreementLocationItem ON AgreementLocationItem.id =  PurchaseOrder.AgreementLocationItemId 
                INNER JOIN Agreement ON Agreement.id = AgreementLocationItem.agreementId`
                    let conditionalTable = 'AgreementLocationItem'

                    if (purchaseOrder.agreementPackageId) {
                        conditionalQuery = `INNER JOIN AgreementPackage ON AgreementPackage.id =  PurchaseOrder.AgreementPackageId 
                    INNER JOIN Agreement ON Agreement.id = AgreementPackage.agreementId`
                        conditionalTable = 'AgreementPackage'
                    }

                    if (purchaseOrder.agreementMemorialId) {
                        conditionalQuery = `INNER JOIN AgreementMemorial on AgreementMemorial.id=PurchaseOrder.agreementMemorialId
                    INNER JOIN AgreementMemorialItem on   (AgreementMemorialItem.agreementMemorialId=AgreementMemorial.id
                        and PurchaseOrderItem.replacedLocationItemId= AgreementMemorialItem.locationItemId ) OR (
                            AgreementMemorialItem.agreementMemorialId=AgreementMemorial.id AND
                              PurchaseOrderItem.locationItemId= AgreementMemorialItem.locationItemId
                        )
                    INNER JOIN Agreement ON Agreement.id = AgreementMemorial.agreementId`
                        conditionalTable = 'AgreementMemorial'
                    }

                    let itemIndustryId
                    if (purchaseOrder.agreementType === 'Cemetry') {
                        itemIndustryId = 1
                    } else if (purchaseOrder.agreementType === 'Miscellaneous Sales') {
                        itemIndustryId = 7
                    } else {
                        itemIndustryId = 2
                    }

                    let purchaseOrderItemsQuery = `
                IF ((select MIN(statusId) as status from PurchaseOrderItem  where purchaseOrderId=${purchaseOrder.id}) =
 
                (SELECT PurchaseOrderStatus.id FROM PurchaseOrderStatus WHERE PurchaseOrderStatus.name IN ('${status}')) )
                BEGIN
                SELECT DISTINCT
                PurchaseOrderItem.id, 
                PurchaseOrderDenyReason.name AS orderDenyReason, 
                PurchaseOrderStatus.name AS status, 
                PurchaseOrderItem.createdAt,
                PurchaseOrderItem.quantity,
                PurchaseOrderItem.unitPrice,
                PurchaseOrderItem.unitTax,
                PurchaseOrderItem.shippingCost,
                PurchaseOrderItem.caseInfoFormId,
                CaseInfoForm.envelopeId,
                CASE WHEN PurchaseOrderItem.replacedLocationItemId IS NULL THEN PurchaseOrderItem.locationItemId ELSE PurchaseOrderItem.replacedLocationItemId END AS locationItemId,
                PurchaseOrderItem.purchaseOrderNumber,
                Item.name AS itemName,
                Location.name AS location,
                Location.id AS locationId,
                Item.id AS itemId,
                Item.code AS itemCode,
                Vendor.name as vendorName,
                Vendor.email as vendorEmail,
                ItemCategory.name AS itemCategory,
                ItemCategory.id AS itemCategoryId,
                ItemCategory.itemTypeId AS itemTypeId,
                ici.itemIndustryId AS itemIndustryId,
                Employee.name AS arranger,
                PurchaseOrderItem.expectedDeliveryDate AS expectedReceiveDate,
                OrderStatus.name AS orderStatus,
                PurchaseOrderItem.orderStatusId,
                PurchaseOrderItem.orderDate,
                PurchaseOrderItem.receivedDate,
                PurchaseOrderItem.receivingDocumentNumber AS receivedDocNumber,
                PurchaseOrderItem.itemReplacementNote AS replaceNote,
                ${conditionalTable}.id AS resourceId,
                PurchaseOrderItem.itemUsageId
                FROM PurchaseOrderItem
                LEFT OUTER JOIN PurchaseOrderDenyReason ON PurchaseOrderDenyReason.id = PurchaseOrderItem.orderDenyReasonId
                LEFT JOIN CaseInfoForm ON CaseInfoForm.id = PurchaseOrderItem.caseInfoFormId
                INNER JOIN PurchaseOrderStatus ON PurchaseOrderStatus.id = PurchaseOrderItem.statusId
                INNER JOIN LocationItem ON (LocationItem.id = PurchaseOrderItem.locationItemId AND PurchaseOrderItem.replacedLocationItemId IS NULL) OR (LocationItem.id = PurchaseOrderItem.replacedLocationItemId)
                INNER JOIN Location ON Location.id = LocationItem.locationId
                INNER JOIN Item ON Item.id = LocationItem.itemId
                INNER JOIN Vendor ON Vendor.id = Item.vendorId
                INNER JOIN ItemCategory ON ItemCategory.id = Item.itemCategoryId
                INNER JOIN PurchaseOrder ON PurchaseOrder.id = PurchaseOrderItem.purchaseOrderId
                INNER JOIN ItemCategoryIndustry ici ON ici.itemCategoryId = ItemCategory.id and ici.itemIndustryId = ${itemIndustryId}
                ${conditionalQuery}
                LEFT OUTER JOIN Employee ON Employee.id = Agreement.arrangerId
                LEFT OUTER JOIN OrderStatus ON OrderStatus.id = PurchaseOrderItem.orderStatusId
                WHERE  PurchaseOrderItem.purchaseOrderId=${purchaseOrder.id}
                END`

                    const purchaseOrderItems = await models.sequelize.query(
                        purchaseOrderItemsQuery,
                        {
                            type: models.sequelize.QueryTypes.SELECT
                        }
                    )

                    await Promise.all(
                        purchaseOrderItems.map(async (item, index) => {
                            let itemAttributesQuery = `SELECT Attribute.name as attribute, AttributeValue.name as attributeValue
                            FROM Item
                            INNER JOIN ItemAttributeValue ON ItemAttributeValue.itemId = Item.id
                            INNER JOIN AttributeValue ON AttributeValue.id = ItemAttributeValue.attributeValueId
                            INNER JOIN Attribute ON Attribute.id = AttributeValue.attributeId
                            WHERE Item.id = ${item.itemId}`

                            const itemAttributes = await models.sequelize.query(
                                itemAttributesQuery,
                                {
                                    type: models.sequelize.QueryTypes.SELECT
                                }
                            )

                            purchaseOrderItems[index].attributes = itemAttributes

                            /**
                             * 1. Make a connection to casket, urn or vault table using item category and resourceId - Completed
                             * 2. Check if those ids exist in funeral service or cemetery service
                             * 3. Make the necessary connection to scheduling section or interment/disinterment section to fetch the beginning time
                             */
                            let resourceTypeId = _.get(item, 'itemUsageId', null) || _.get(item, 'resourceId', null)
                            let resourceType = null
                            let resourceTypeQuery

                            let resourceQuery = `select DISTINCT ic.name as itemCategoryName from Item i inner join ItemCategory ic 
                            on i.itemCategoryId =ic.id 
                            INNER join ItemAttributeValue iav on i.id = iav.itemId 
                            inner join AttributeValue av on iav.attributeValueId = av.id
                            inner join Attribute a on av.attributeId = a.id
                            where av.name = 'CREMATION CONTAINER' AND ic.name != 'Other Merchandise'`
                            let serviceDeatils = await models.sequelize.query(resourceQuery, {
                                type: models.sequelize.QueryTypes.SELECT
                            })
                            let itemCategory = ['Casket']
                            itemCategory.push(...serviceDeatils.map((ele) => {
                                return ele.itemCategoryName
                            }))

                            if (resourceTypeId) {
                                if (item.itemCategory === 'Urn') {
                                    resourceTypeQuery = `
                                    SELECT id
                                    FROM UrnInformationSection
                                    WHERE urnId = ${resourceTypeId}`
                                // } else if (item.itemCategory === 'Casket') {
                                } else if (itemCategory.includes(item.itemCategory)) {
                                    resourceTypeQuery = `
                                    SELECT id
                                    FROM CasketSection
                                    WHERE casketId = ${resourceTypeId}`
                                } else if (item.itemCategory === 'Vault') {
                                    resourceTypeQuery = `
                                    SELECT id
                                    FROM VaultSection
                                    WHERE vaultId = ${resourceTypeId}`
                                } else {
                                    console.log('None of the main categories')
                                }
                            }

                            // 1. Make a connection to casket, urn or vault table using item category and resourceId
                            if (resourceTypeQuery) {
                                resourceType = await models.sequelize.query(
                                    resourceTypeQuery,
                                    {
                                        type: models.sequelize.QueryTypes.SELECT
                                    }
                                )
                            }

                            let resourceId = _.get(resourceType, '[0].id', null)

                            let funeralServiceDate = null
                            let cemeteryServiceDate = null

                            // 2. Check if those ids exist in funeral service or cemetery service
                            if (resourceId) {
                                let funeralServiceDateQuery = `
                                SELECT SchedulingSection.beginningTime,ScheduledFuneralService.id
                                FROM ScheduledFuneralService
                                LEFT JOIN SchedulingSection ON ScheduledFuneralService.schedulingSectionId = SchedulingSection.id
                                WHERE SchedulingSection.beginningTime IS NOT NULL
                                AND ScheduledFuneralService.deletedAt IS NULL
                                AND ScheduledFuneralService.deletedBy IS NULL
                                ${item.itemCategory === 'Casket' ? `AND casketSectionId = ${resourceId}` : ''}
                                ${item.itemCategory === 'Urn' ? `AND urnInformationSectionId = ${resourceId}` : ''}
                                ORDER BY SchedulingSection.beginningTime`

                                let funeralServiceDetails = await models.sequelize.query(
                                    funeralServiceDateQuery,
                                    {
                                        type: models.sequelize.QueryTypes.SELECT
                                    }
                                )

                                funeralServiceDate = _.get(funeralServiceDetails, '[0].beginningTime', null)

                                // If there is no funeral service for the purchase order item, then
                                if (!funeralServiceDate) {
                                    let cemeteryServiceDateQuery = `
                                    SELECT
                                    COALESCE (
                                        DisintermentInfoSection.beginningTime,
                                        IntermentInformationSection.beginningTime
                                    ) AS beginningTime, ScheduledCemeteryService.id
                                    FROM ScheduledCemeteryService
                                    LEFT JOIN IntermentInformationSection ON IntermentInformationSection.id = ScheduledCemeteryService.intermentInformationSectionId
                                    LEFT JOIN DisintermentInfoSection ON DisintermentInfoSection.id = ScheduledCemeteryService.disintermentInfoSectionId
                                    WHERE
                                    ScheduledCemeteryService.deletedAt IS NULL
                                    AND ScheduledCemeteryService.deletedBy IS NULL
                                    ${item.itemCategory === 'Casket' ? `AND casketSectionId = ${resourceId}` : ''}
                                    ${item.itemCategory === 'Urn' ? `AND urnInformationSectionId = ${resourceId}` : ''}
                                    ${item.itemCategory === 'Vault' ? `AND vaultSectionId = ${resourceId}` : ''}
                                    ORDER BY beginningTime
                                   `

                                    let cemeteryServiceDateDetails = await models.sequelize.query(
                                        cemeteryServiceDateQuery,
                                        {
                                            type: models.sequelize.QueryTypes.SELECT
                                        }
                                    )

                                    cemeteryServiceDate = _.get(cemeteryServiceDateDetails, '[0].beginningTime', null)
                                }
                            }

                            if (funeralServiceDate || cemeteryServiceDate) {
                                let serviceDate = funeralServiceDate || cemeteryServiceDate
                                purchaseOrderItems[index].serviceDate = serviceDate || '-'
                            } else {
                                purchaseOrderItems[index].serviceDate = '-'
                            }
                        })
                    )

                    purchaseOrders[index].items = purchaseOrderItems
                })
            )

            let countQuery = `SELECT COUNT(DISTINCT PO.id) AS total ${purchaseOrderPrimaryQuery}`

            const count = await models.sequelize.query(countQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })

            return {
                total: count[0].total,
                purchaseOrders
            }
        } catch (error) {
            throw error
        }
    }

    /**
   * This function gets all the purchase order deny reasons
   * @param {*} name Ex: Pull From Inventory, Item Not Available
   */
    static async getPurchaseOrderDenyReason (name, transaction) {
        try {
            let result
            if (name) {
                result = await models.PurchaseOrderDenyReason.findAll({
                    where: {
                        name
                    },
                    transaction
                })
            } else {
                result = await models.PurchaseOrderDenyReason.findAll({ transaction })
            }
            return result
        } catch (error) {
            throw error
        }
    }

    /**
   * This function gets all the purchase order status
   * @param {*} name EX: ToBeOrdered, OnOrder, Received, Invalid
   */
    static async getPurchaseOrderStatus (name, transaction) {
        try {
            let result
            if (name) {
                result = await models.PurchaseOrderStatus.findAll({
                    where: {
                        name
                    },
                    transaction
                })
            } else {
                result = await models.PurchaseOrderStatus.findAll({ transaction })
            }
            return result
        } catch (error) {
            throw error
        }
    }

    /**
   * This function gets all the order status
   * @param {*} name EX: Received, Shortage
   */
    static async getOrderStatus (name, transaction) {
        try {
            let result
            if (name) {
                result = await models.OrderStatus.findAll({
                    where: {
                        name
                    },
                    transaction
                })
            } else {
                result = await models.OrderStatus.findAll({ transaction })
            }
            return result
        } catch (error) {
            throw error
        }
    }

    /**
   * This function gets the status of the purchase order
   * @param {number} purchaseOrderId
   * @param {string} status
   * @param {*} transaction
   */
    // TODO: Rename the functionality
    static async getStatusForPurchaseOrder (purchaseOrderId, status, transaction) {
        try {
            let statuses = status.map(ele => `'${ele}'`)
            let PurchaseOrderQuery = `SELECT DISTINCT(statusId) FROM PurchaseOrderItem
            INNER JOIN PurchaseOrder ON PurchaseOrder.id = PurchaseOrderItem.purchaseOrderId
            INNER JOIN PurchaseOrderStatus ON PurchaseOrderStatus.id = PurchaseOrderItem.statusId
            WHERE PurchaseOrder.id = ${purchaseOrderId} AND  PurchaseOrderItem.statusId IN (
                SELECT id FROM PurchaseOrderStatus WHERE name IN (${statuses.join(
        ','
    )})
            )`

            const PurchaseOrder = await models.sequelize.query(PurchaseOrderQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                transaction
            })
            return PurchaseOrder
        } catch (error) {
            throw error
        }
    }

    /**
   * This function generates the purchase order form and sends it to the vendor and the staff
   * @param {number} purchaseOrderId
   * @param {number} purchaseOrderItemId
   * @param {*} currentUser
   * @param {string} alternateEmail used to send email to the alternate email address of the vendor
   * @param {*} receivedTransaction used to send email to the alternate email address of the vendor
   */
    static async generatePurchaseOrderForm (
        purchaseOrderId,
        purchaseOrderItemId,
        currentUser,
        alternateEmail,
        receivedTransaction
    ) {
        let transaction
        try {
            // Check if the purchase order id is valid
            transaction =
        receivedTransaction || (await models.sequelize.transaction())
            let purchaseOrderDetails = await PurchaseOrderController.getPurchaseOrder(
                purchaseOrderId,
                transaction
            )

            // Check if the purchase order items is of status on order or received
            let purchaseOrder = await PurchaseOrderController.getStatusForPurchaseOrder(
                purchaseOrderId,
                ['OnOrder', 'Received'],
                transaction
            )
            if (!purchaseOrder.length === 1) throw new Error('INVALID_PURCHASE_ORDER')

            // Finding the form details of purcahseOrderForm this
            let formDetail = await models.Form.findOne({
                where: {
                    title: 'Purchase Order form to send to Vendors'
                },
                transaction
            })

            // The id of the purchaseOrder form
            let formId = formDetail.id

            // Finding the formRecipient Details
            let purchasingDepartmentDetails = await models.FormRecipientRole.findOne({
                where: {
                    docusignRole: 'Purchasing Dept',
                    formId
                },
                transaction
            })
            let vendorDetails = await models.FormRecipientRole.findOne({
                where: {
                    docusignRole: 'Vendor',
                    formId
                },
                transaction
            })
            let alternateVendorDetails = await models.FormRecipientRole.findOne({
                where: {
                    docusignRole: 'Alternate Vendor',
                    formId
                },
                transaction
            })

            // Finding the vendorId for the purchaseOrderItemId
            let vendorQuery = `SELECT Item.vendorId FROM PurchaseOrderItem
            INNER JOIN LocationItem ON (LocationItem.id = PurchaseOrderItem.locationItemId AND PurchaseOrderItem.replacedLocationItemId IS NULL) OR (LocationItem.id = PurchaseOrderItem.replacedLocationItemId)
            INNER JOIN Item ON Item.id = LocationItem.itemId
            WHERE PurchaseOrderItem.id = '${purchaseOrderItemId}'`

            const vendor = await models.sequelize.query(vendorQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                transaction
            })

            // The vendor details
            let vendors = [
                {
                    availableInPerson: false,
                    formRecipientRoleId: vendorDetails.id,
                    id: vendor[0].vendorId
                }
            ]

            let agreementDetails
            if (purchaseOrderDetails.agreementMemorialId) {
                agreementDetails = await models.AgreementMemorial.findOne({
                    include: [{
                        model: models.Agreement,
                        as: 'agreement',
                        required: true,
                        include: [{
                            model: models.AgreementType,
                            as: 'agreementType',
                            required: true
                        }]
                    }],
                    where: {
                        id: purchaseOrderDetails.agreementMemorialId
                    }
                })
            } else if (purchaseOrderDetails.agreementLocationItemId) {
                agreementDetails = await models.AgreementLocationItem.findOne({
                    include: [{
                        model: models.Agreement,
                        as: 'agreementDetails',
                        required: true,
                        include: [{
                            model: models.AgreementType,
                            as: 'agreementType',
                            required: true
                        }]
                    }],
                    where: {
                        id: purchaseOrderDetails.agreementLocationItemId
                    },
                    paranoid: false
                })
            } else {
                agreementDetails = await models.AgreementPackage.findOne({
                    include: [{
                        model: models.Agreement,
                        as: 'agreementDetails',
                        required: true,
                        include: [{
                            model: models.AgreementType,
                            as: 'agreementType',
                            required: true
                        }]
                    }],
                    where: {
                        id: purchaseOrderDetails.agreementPackageId
                    }
                })
            }

            // Finding the agreementId for the purchaseOrder
            let agreementId = agreementDetails.agreementId
            let agreementNeedType = _.get(agreementDetails, 'agreementDetails.agreementType.agreementType', null) || _.get(agreementDetails, 'agreement.agreementType.agreementType', null)

            // let personDetails = await models.AgreementPerson.findOne({
            //     where: {
            //         agreementId,
            //         isOwner: 1
            //     }
            // }) Check if there is going to be only one person for the passed agreement id

            let agreementPersonQuery = `
            SELECT AgreementPerson.personId
            FROM
            AgreementPerson
            WHERE AgreementPerson.agreementId =:agreementId
            AND roleId = (
                SELECT AgreementRole.id
                FROM 
                AgreementRole
                WHERE AgreementRole.name =:agreementPersonRole
            )`

            let personDetailsQuery = `
            SELECT
                CASE
                    WHEN PurchaseOrderItem.itemUsageId IS NOT NULL THEN ItemUsage.personId
                    ELSE (
                        ${agreementPersonQuery}
                    )
                END AS personId
            FROM
            PurchaseOrderItem
            LEFT JOIN ItemUsage ON ItemUsage.id = PurchaseOrderItem.itemUsageId
            WHERE PurchaseOrderItem.id =:purchaseOrderItemId`

            let agreementPersonRole = 'Beneficiary'

            if (agreementNeedType === 'Miscellaneous Sales') {
                personDetailsQuery = agreementPersonQuery
                agreementPersonRole = 'Purchaser'
            }

            // Finding the decedent details
            let personDetails = await models.sequelize.query(personDetailsQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                transaction,
                replacements: {
                    purchaseOrderItemId,
                    agreementId,
                    agreementPersonRole
                }
            })

            // Temperory solution to overcome the empty email in employee table and lack of purchasedepartment details.
            let otherRecipients = [
                {
                    name: purchaseDepartmantInfo.docusignRole,
                    email: purchaseDepartmantInfo.email,
                    availableInPerson: false,
                    formRecipientRoleId: purchasingDepartmentDetails.id
                }
            ]

            if (alternateEmail) {
                otherRecipients.push(
                    {
                        name: 'Vendor',
                        email: alternateEmail,
                        availableInPerson: false,
                        formRecipientRoleId: alternateVendorDetails.id
                    }
                )
            }

            // Trigger the docusign form generation function and send it to the vendor of the corresponding item and the current user
            let personId = personDetails[0].personId

            let requiredData = [
                {
                    agreementPersons: [],
                    contacts: [],
                    employees: [],
                    vendors,
                    formId,
                    otherRecipients,
                    purchaseOrderId,
                    purchaseOrderItemId
                }
            ]

            await transaction.commit()
            const FormsController = require('../formsController/formsController')

            await FormsController.createCaseInfoFormsAndSendUsingDocusign(
                personId,
                requiredData,
                currentUser
            )

            // return a success scenario
            return true
        } catch (error) {
            await transaction.rollback()
            throw error
        }
    }

    /**
   * This function generates the purchase order form and sends it to the vendor and the staff
   * @param {number} purchaseOrderItemId
   */
    async previewPurchaseOrderForm (purchaseOrderItemId) {
        let transaction
        try {
            transaction = await models.sequelize.transaction()

            // Query to fetch the envelopeId
            let envelopeIdQuery = `SELECT
            CaseInfoForm.envelopeId
            FROM PurchaseOrderItem
            INNER JOIN CaseInfoForm ON CaseInfoForm.id = PurchaseOrderItem.caseInfoFormId
            WHERE PurchaseOrderItem.id = '${purchaseOrderItemId}'`

            const envelopeDetails = await models.sequelize.query(envelopeIdQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                transaction
            })

            let result = await docuSignClient.generatePreviewUrl(
                envelopeDetails[0].envelopeId
            )

            await transaction.commit()

            // return the url for the purchaser order form
            return {
                url: result
            }
        } catch (error) {
            await transaction.rollback()
            throw error
        }
    }

    static async purchaseOrderItemChangeMethod (
        poId,
        payload,
        userId,
        transaction
    ) {
        try {
            let itemPrice = await PurchaseOrderController.getItemPrice(
                _.get(payload, 'item.replacedLocationItemId'),
                transaction
            )
            let agreementItemPriceControllerInstance = new AgreementItemPriceController()
            let taxValue = await agreementItemPriceControllerInstance.getTaxPercent(
                _.get(payload, 'item.replacedLocationItemId'),
                transaction
            )
            let unitTax = taxValue ? (itemPrice * taxValue) / 100 : 0
            let purchaseOrderItemDetail = await models.PurchaseOrderItem.findOne({
                where: {
                    id: payload.item.id
                },
                include: [
                    {
                        model: models.CaseInfoForm,
                        as: 'caseInfoForm'
                    }
                ],
                transaction
            })
            if (
                purchaseOrderItemDetail.caseInfoForm &&
        purchaseOrderItemDetail.caseInfoForm.envelopeId
            ) {
                const FormsController = require('../formsController/formsController')

                await FormsController.voidCaseInfoForm(
                    purchaseOrderItemDetail.caseInfoForm.id,
                    null,
                    transaction,
                    { isPersonIdNeeded: false }
                )
            }
            let itemPayload = {
                id: _.get(payload, 'item.id'),
                quantity: _.get(payload, 'item.quantity', 1),
                unitPrice: itemPrice,
                unitTax,
                shippingCost: 0,
                caseInfoFormId: null,
                replacedLocationItemId: _.get(payload, 'item.replacedLocationItemId'),
                itemReplacementNote: _.get(payload, 'item.replaceNotes')
            }
            let purchaseOrderItem = await PurchaseOrderItemController.createOrEditPurchaseOrderItem(
                itemPayload,
                userId,
                transaction
            )
            await transaction.commit()
            await PurchaseOrderController.purchaseOrderEmailNotification(
                purchaseOrderItem.statusId,
                purchaseOrderItem.id,
                { name: 'modified' }
            )
            return purchaseOrderItem
        } catch (error) {
            if (transaction) await transaction.rollback()
            throw error
        }
    }

    /**
   * Replace existing Purchase order item with new one item
   * @param {*} payload
   * @param {*} payload.id PurchaseOrderId
   * @param {*} payload.item.id purchaseOrderItemId
   * @param {*} payload.item.price
   * @param {*} payload.item.quantity
   * @param {*} payload.item.shippingCost
   * @param {*} payload.item.replacedLocationItemId
   * @param {string} payload.item.replaceNote
   * @param {*} userId
   */
    async purchaseOrderItemChange (payload, userId) {
        let transaction
        if (Array.isArray(_.get(payload, 'item'))) {
            return Promise.all(
                payload.item.map(async itemObj => {
                    let item = {
                        item: {}
                    }
                    item.item.id = itemObj.id
                    item.item.replacedLocationItemId = itemObj.replacedLocationItemId
                    item.item.agreementMemorialItemId = itemObj.agreementMemorialItemId
                    item.item.itemReplacementNote = itemObj.replaceNotes
                    transaction = await models.sequelize.transaction()
                    await PurchaseOrderController.purchaseOrderItemChangeMethod(
                        this.id,
                        item,
                        userId,
                        transaction
                    )
                    return itemObj
                })
            )
        } else {
            transaction = await models.sequelize.transaction()
            return PurchaseOrderController.purchaseOrderItemChangeMethod(
                this.id,
                payload,
                userId,
                transaction
            )
        }
    }

    /**
   * Method which sends notification when changes are made to a purchase order
   * @param {number} statusId
   * @param {number} purchaserOrderItemId
   * @param {*} tag // To tag modified items while in a status eg: modified
   */
    static async purchaseOrderEmailNotification (
        statusId,
        purchaserOrderItemId,
        tag,
        transaction
    ) {
        try {
            const { queueNames, queues } = require('../../../appQueues')
            const purchaseOrderEmailWorker = queues[queueNames.email_queue]
            // Fetching all the status available for a purchaseOrder
            let purchaseOrderStatuses = await models.PurchaseOrderStatus.findAll({
                transaction
            })

            // Fetching the status name for the received statusId
            let purchaseOrderStatus = purchaseOrderStatuses.find(
                status => status.id === statusId
            )

            let status = purchaseOrderStatus.name

            // Fetching purchaseOrderItemDetails
            let purchaseOrderItemDetailsQuery = `SELECT 
            Item.code,
            Item.name,
            PurchaseOrderItem.purchaseOrderNumber,
            PurchaseOrderItem.quantity
            FROM PurchaseOrderItem
            INNER JOIN LocationItem ON (LocationItem.id = PurchaseOrderItem.locationItemId AND PurchaseOrderItem.replacedLocationItemId IS NULL) OR (LocationItem.id = PurchaseOrderItem.replacedLocationItemId)
            INNER JOIN Item ON Item.id = LocationItem.itemId
            WHERE PurchaseOrderItem.id='${purchaserOrderItemId}'`

            let purchaseOrderItemDetails = await models.sequelize.query(
                purchaseOrderItemDetailsQuery,
                {
                    type: models.sequelize.QueryTypes.SELECT,
                    transaction
                }
            )

            // Fetching purchaseOrderDetails
            let purchaseOrderDetailsQuery = `SELECT *
            FROM PurchaseOrder
            INNER JOIN PurchaseOrderItem ON PurchaseOrderItem.purchaseOrderId = PurchaseOrder.id
            WHERE PurchaseOrderItem.id='${purchaserOrderItemId}'`

            let purchaseOrderDetails = await models.sequelize.query(
                purchaseOrderDetailsQuery,
                {
                    type: models.sequelize.QueryTypes.SELECT,
                    transaction
                }
            )

            let agreementDetailsJoinTable
            let agreementDetailsFilter

            if (purchaseOrderDetails[0].agreementMemorialId) {
                agreementDetailsJoinTable = `AgreementMemorial`
                agreementDetailsFilter = `AgreementMemorial.id='${purchaseOrderDetails[0].agreementMemorialId}'`
            } else if (purchaseOrderDetails[0].agreementPackageId) {
                agreementDetailsJoinTable = `AgreementPackage`
                agreementDetailsFilter = `AgreementPackage.id='${purchaseOrderDetails[0].agreementPackageId}'`
            } else {
                agreementDetailsJoinTable = `AgreementLocationItem`
                agreementDetailsFilter = `AgreementLocationItem.id='${purchaseOrderDetails[0].agreementLocationItemId}'`
            }

            // Fetching agreement details
            let agreementDetailsQuery = `SELECT Agreement.id AS agreementId, Agreement.contractNumber, Addendum.addendumNumber, Person.firstName, Person.lastName, Person.middleName
            FROM Agreement
            INNER JOIN ${agreementDetailsJoinTable} ON ${agreementDetailsJoinTable}.agreementId = Agreement.id
            LEFT JOIN Addendum on Addendum.id in (${agreementDetailsJoinTable}.addendumId)
            INNER JOIN AgreementPerson ap on ap.agreementId = Agreement.id 
            INNER JOIN Person on (Person.id = ap.personId AND (Person.isAlive = 0 OR Agreement.type = 5))
            WHERE ${agreementDetailsFilter}`

            let agreementDetails = await models.sequelize.query(
                agreementDetailsQuery,
                {
                    type: models.sequelize.QueryTypes.SELECT,
                    transaction
                }
            )

            let notifierDetails
            let emailContractNumber = agreementDetails[0].addendumNumber ? agreementDetails[0].addendumNumber : agreementDetails[0].contractNumber
            // Email triggers for each scenarios

            // Email trigger for when the items are just created
            if (status === 'ToBeOrdered' && (!tag.name.length || tag.name === 'Item Deleted' || tag.name === 'modified')) {
                // Fetching the arranger info
                let arrangerDetailsQuery = `SELECT name, email
                FROM Employee
                INNER JOIN Agreement ON Agreement.arrangerId = Employee.id
                WHERE Agreement.id = '${agreementDetails[0].agreementId}'`

                let arrangerDetails = await models.sequelize.query(
                    arrangerDetailsQuery,
                    {
                        type: models.sequelize.QueryTypes.SELECT,
                        transaction
                    }
                )

                notifierDetails = {
                    purchaseOrderNumber: purchaseOrderItemDetails[0].purchaseOrderNumber,
                    contractNumber: emailContractNumber,
                    notifierName: purchaseDepartmantInfo.name,
                    notifierEmail: purchaseDepartmantInfo.email,
                    emailTemplate: 'template1'
                }

                // When the item have been deleted when the items are in the status to be ordered
                if (tag && tag.name === 'Item Deleted') {
                    notifierDetails = {
                        purchaseOrderNumber: purchaseOrderItemDetails[0].purchaseOrderNumber,
                        contractNumber: emailContractNumber,
                        notifierName: purchaseDepartmantInfo.name,
                        notifierEmail: purchaseDepartmantInfo.email,
                        itemId: purchaseOrderItemDetails[0].code,
                        itemDescription: purchaseOrderItemDetails[0].name,
                        emailTemplate: 'template7'
                    }
                }

                // When the values have been modified when the items are in the status to be ordered
                if (tag && tag.name === 'modified') {
                    notifierDetails = {
                        purchaseOrderNumber: purchaseOrderItemDetails[0].purchaseOrderNumber,
                        contractNumber: emailContractNumber,
                        notifierName: arrangerDetails[0].name,
                        notifierEmail: arrangerDetails[0].email,
                        itemId: purchaseOrderItemDetails[0].code,
                        itemDescription: purchaseOrderItemDetails[0].name,
                        itemQuantity: purchaseOrderItemDetails[0].quantity,
                        emailTemplate: 'template4'
                    }
                }
            }

            // Email trigger for when the items status changes to on order
            if (status === 'OnOrder') {
                // Fetching the arranger info
                let arrangerDetailsQuery = `SELECT name, email
                FROM Employee
                INNER JOIN Agreement ON Agreement.arrangerId = Employee.id
                WHERE Agreement.id = '${agreementDetails[0].agreementId}'`
                // When the env is not production or uat fetching the dummy employee details
                // if (
                //     process.env.NODE_ENV !== 'production' || process.env.NODE_ENV !== 'UAT'
                // ) {
                //     arrangerDetailsQuery = `SELECT name, email
                //     FROM Employee
                //     WHERE email='f@gmail.com'`
                // }
                let arrangerDetails = await models.sequelize.query(
                    arrangerDetailsQuery,
                    {
                        type: models.sequelize.QueryTypes.SELECT,
                        transaction
                    }
                )

                if (!arrangerDetails.length) {
                    throw new Error('SALES_COUNSELOR_NOT_FOUND')
                }
                /* let purchaseDepartmentDetailsQuery = `SELECT name, email
                 FROM Employee
                 WHERE email='w@gmail.com'` */
                notifierDetails = {
                    purchaseOrderNumber: purchaseOrderItemDetails[0].purchaseOrderNumber,
                    contractNumber: emailContractNumber,
                    notifierName: arrangerDetails[0].name,
                    notifierEmail: arrangerDetails[0].email,
                    itemId: purchaseOrderItemDetails[0].code,
                    itemDescription: purchaseOrderItemDetails[0].name,
                    itemQuantity: purchaseOrderItemDetails[0].quantity,
                    emailTemplate: 'template2'
                }

                // When the values have been modified when the items are in the status on order
                if (tag && tag.name === 'modified') {
                    notifierDetails = {
                        purchaseOrderNumber: purchaseOrderItemDetails[0].purchaseOrderNumber,
                        contractNumber: emailContractNumber,
                        notifierName: arrangerDetails[0].name,
                        notifierEmail: arrangerDetails[0].email,
                        itemId: purchaseOrderItemDetails[0].code,
                        itemDescription: purchaseOrderItemDetails[0].name,
                        itemQuantity: purchaseOrderItemDetails[0].quantity,
                        emailTemplate: 'template4'
                    }
                }

                // When the quantity have been modified when the items are in the status on order
                if (tag && tag.name === 'modified quantity') {
                    notifierDetails = {
                        purchaseOrderNumber: purchaseOrderItemDetails[0].purchaseOrderNumber,
                        contractNumber: emailContractNumber,
                        notifierName: purchaseDepartmantInfo.name,
                        notifierEmail: purchaseDepartmantInfo.email,
                        itemId: purchaseOrderItemDetails[0].code,
                        itemDescription: purchaseOrderItemDetails[0].name,
                        itemQuantity: tag.modifiedQuantity,
                        emailTemplate: 'template6'
                    }
                }

                // When the item have been deleted when the items are in the status on order
                if (tag && tag.name === 'Item Deleted') {
                    notifierDetails = {
                        purchaseOrderNumber: purchaseOrderItemDetails[0].purchaseOrderNumber,
                        contractNumber: emailContractNumber,
                        notifierName: purchaseDepartmantInfo.name,
                        notifierEmail: purchaseDepartmantInfo.email,
                        itemId: purchaseOrderItemDetails[0].code,
                        itemDescription: purchaseOrderItemDetails[0].name,
                        emailTemplate: 'template7'
                    }
                }
            }

            // Email trigger for when the items status changes to on invalid
            if (status === 'Invalid') {
                // Fetching the arranger info
                let arrangerDetailsQuery = `SELECT name, email
                FROM Employee
                INNER JOIN Agreement ON Agreement.arrangerId = Employee.id
                WHERE Agreement.id = '${agreementDetails[0].agreementId}'`
                // When the env is not production or uat fetching the dummy employee details
                // if (
                //     process.env.NODE_ENV !== 'production' || process.env.NODE_ENV !== 'UAT'
                // ) {
                //     arrangerDetailsQuery = `SELECT name, email
                //     FROM Employee
                //     WHERE email='f@gmail.com'`
                // }

                let arrangerDetails = await models.sequelize.query(
                    arrangerDetailsQuery,
                    {
                        type: models.sequelize.QueryTypes.SELECT,
                        transaction
                    }
                )

                // let purchaseDepartmentDetailsQuery = `SELECT name, email
                // FROM Employee
                // WHERE email='w@gmail.com'`

                notifierDetails = {
                    purchaseOrderNumber: purchaseOrderItemDetails[0].purchaseOrderNumber,
                    contractNumber: emailContractNumber,
                    notifierName: arrangerDetails[0].name,
                    notifierEmail: arrangerDetails[0].email,
                    itemId: purchaseOrderItemDetails[0].code,
                    itemDescription: purchaseOrderItemDetails[0].name,
                    itemQuantity: purchaseOrderItemDetails[0].quantity,
                    emailTemplate: 'template3'
                }

                // When the quantity have been modified when the items are in the status invalid
                if (tag && tag.name === 'modified quantity') {
                    notifierDetails = {
                        purchaseOrderNumber: purchaseOrderItemDetails[0].purchaseOrderNumber,
                        contractNumber: emailContractNumber,
                        notifierName: purchaseDepartmantInfo.name,
                        notifierEmail: purchaseDepartmantInfo.email,
                        itemId: purchaseOrderItemDetails[0].code,
                        itemDescription: purchaseOrderItemDetails[0].name,
                        itemQuantity: tag.modifiedQuantity,
                        emailTemplate: 'template6'
                    }
                }

                // When the item have been deleted when the items are in the status invalid
                if (tag && tag.name === 'Item Deleted') {
                    notifierDetails = {
                        purchaseOrderNumber: purchaseOrderItemDetails[0].purchaseOrderNumber,
                        contractNumber: emailContractNumber,
                        notifierName: purchaseDepartmantInfo.name,
                        notifierEmail: purchaseDepartmantInfo.email,
                        itemId: purchaseOrderItemDetails[0].code,
                        itemDescription: purchaseOrderItemDetails[0].name,
                        emailTemplate: 'template7'
                    }
                }
            }

            // Email trigger for when the items status changes to on received
            if (status === 'Received') {
                // Fetching the arranger info
                let arrangerDetailsQuery = `SELECT name, email
                FROM Employee
                INNER JOIN Agreement ON Agreement.arrangerId = Employee.id
                WHERE Agreement.id = '${agreementDetails[0].agreementId}'`
                // When the env is not production or uat fetching the dummy employee details
                // if (
                //     process.env.NODE_ENV !== 'production' || process.env.NODE_ENV !== 'UAT'
                // ) {
                //     arrangerDetailsQuery = `SELECT name, email
                //     FROM Employee
                //     WHERE email='f@gmail.com'`
                // }

                let arrangerDetails = await models.sequelize.query(
                    arrangerDetailsQuery,
                    {
                        type: models.sequelize.QueryTypes.SELECT,
                        transaction
                    }
                )

                notifierDetails = {
                    purchaseOrderNumber: purchaseOrderItemDetails[0].purchaseOrderNumber,
                    contractNumber: emailContractNumber,
                    notifierName: arrangerDetails[0].name,
                    notifierEmail: arrangerDetails[0].email,
                    itemId: purchaseOrderItemDetails[0].code,
                    itemDescription: purchaseOrderItemDetails[0].name,
                    itemQuantity: purchaseOrderItemDetails[0].quantity,
                    emailTemplate: 'template5'
                }

                // When the quantity have been modified when the items are in the status received
                if (tag && tag.name === 'modified quantity') {
                    notifierDetails = {
                        purchaseOrderNumber: purchaseOrderItemDetails[0].purchaseOrderNumber,
                        contractNumber: emailContractNumber,
                        notifierName: purchaseDepartmantInfo.name,
                        notifierEmail: purchaseDepartmantInfo.email,
                        itemId: purchaseOrderItemDetails[0].code,
                        itemDescription: purchaseOrderItemDetails[0].name,
                        itemQuantity: tag.modifiedQuantity,
                        emailTemplate: 'template6'
                    }
                }

                // When the item have been deleted when the items are in the status received
                if (tag && tag.name === 'Item Deleted') {
                    notifierDetails = {
                        purchaseOrderNumber: purchaseOrderItemDetails[0].purchaseOrderNumber,
                        contractNumber: emailContractNumber,
                        notifierName: purchaseDepartmantInfo.name,
                        notifierEmail: purchaseDepartmantInfo.email,
                        itemId: purchaseOrderItemDetails[0].code,
                        itemDescription: purchaseOrderItemDetails[0].name,
                        emailTemplate: 'template7'
                    }
                }

                if (tag && tag.name === 'pullFromInventory') {
                    let decedentName = returnFullName(agreementDetails[0])

                    let purchaseOrderItemDetailsQuery = `select PurchaseOrderItem.createdAt, Location.name  FROM PurchaseOrderItem
                    INNER JOIN PurchaseOrderStatus ON PurchaseOrderStatus.id = PurchaseOrderItem.statusId
                    INNER JOIN LocationItem ON (LocationItem.id = PurchaseOrderItem.locationItemId AND PurchaseOrderItem.replacedLocationItemId IS NULL) OR (LocationItem.id = PurchaseOrderItem.replacedLocationItemId)
                    INNER JOIN Location ON Location.id = LocationItem.locationId 
                    WHERE PurchaseOrderItem.purchaseOrderId = '${purchaseOrderDetails[0].purchaseOrderId}'`

                    let poItemDetails = await models.sequelize.query(
                        purchaseOrderItemDetailsQuery,
                        {
                            type: models.sequelize.QueryTypes.SELECT,
                            transaction
                        }
                    )
                    notifierDetails = {
                        decedentName: decedentName,
                        purchaseOrderNumber: purchaseOrderItemDetails[0].purchaseOrderNumber,
                        notifierName: purchaseDepartmantInfo.name,
                        notifierEmail: purchaseDepartmantInfo.email,
                        itemId: purchaseOrderItemDetails[0].code,
                        itemDescription: purchaseOrderItemDetails[0].name,
                        serviceDate: poItemDetails[0].createdAt,
                        serviceLocation: poItemDetails[0].name,
                        timezone: tag.timezone,
                        emailTemplate: 'template8'
                    }
                }
            }

            purchaseOrderEmailWorker.add('PurchaseOrderEmail', notifierDetails)
        } catch (error) {
            throw error
        }
    }
}

module.exports = PurchaseOrderController
