const { upsert } = require('../utils')
const models = require('../../../models')

class PurchaseOrderItemController {
    constructor (id) {
        this.id = id // Purchase Order Item Id
    }

    /**
     * This method will create or edit a purchase order item
     * @param {object} payload
     * @param {integer} userId
     */
    static async createOrEditPurchaseOrderItem (payload, userId, transaction) {
        try {
            // Create items for a purchase order, if the id does not exist in the payload, else update the purchase order item
            let purchaseOrderItem = await upsert('PurchaseOrderItem', payload, transaction, { userId })
            return purchaseOrderItem
        } catch (error) {
            throw error
        }
    }

    /**
     * This method will delete a purchase order item
     * @param {object} payload
     * @param {integer} userId
     */
    static async deletePurchaseOrderItem (payload, userId, transaction) {
        try {
            // Soft deleted the purchase order item
            let purchaseOrderItem = await upsert('PurchaseOrderItem', payload, transaction, { userId })
            return purchaseOrderItem
        } catch (error) {
            throw error
        }
    }

    /**
     * This method will get a purchase order item by id
     * @param {integer} purchaseOrderItemId
     */
    static async getItemDetails (purchaseOrderItemId, transaction) {
        // Throw an error if no Item
        try {
            let purchaseOrderItem = await models.PurchaseOrderItem.findOne({
                where: {
                    id: purchaseOrderItemId
                },
                transaction
            })
            if (!purchaseOrderItem) {
                throw new Error('PURCHASE_ORDER_ITEM_NOT_FOUND')
            }
            return purchaseOrderItem
        } catch (error) {
            throw error
        }
    }
}

module.exports = PurchaseOrderItemController
