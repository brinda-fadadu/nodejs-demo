const { upsert } = require('../utils')
const models = require('../../../models')
const logger = require('../../../lib/logger')
class ChangeLog {
    constructor (agreementId) {
        this.agreementId = agreementId
    }
    /**
     * Creates or Updates the change log
     * @param {Object} payload
     * @param {Number} payload.addendumId
     * @param {Number} payload.agreementId
     * @param {String} payload.resourceType
     * @param {String} payload.resourceId
     * @param {String} payload.quantity
     * @param {String} payload.action
     * @returns {Object} result
     * @returns {Boolean} result.success
     */
    static async createOrUpdateLog (payload) {
    }

    /**
     * Get resource details
     * @param {String} resourceType
     * @param {Number} resourceId
     */
    static async __getResourceDetails (resourceType, resourceId, transaction) {

    }

    /**
     * Records action in the change log
     * @param {String} action
     * @param {Number} addendumId
     * @param {String} resourceType
     * @param {Number} resourceId
     * @param {Number} quantity
     */
    static async recordAction (action, resourceId, resourceType, transaction) {
        try {
            const AddendumController = require('./addendum')
            let agreementItem = await models[resourceType].findOne({
                where: {
                    id: resourceId
                },
                include: [{
                    model: models.AgreementItemPrice,
                    as: (resourceType === 'AgreementProperty' || resourceType === 'AgreementPropertyAdditionalRight')
                        ? 'agreementPropertyPriceDetails'
                        : 'agreementItemPrice'
                }],
                paranoid: false,
                transaction
            })
            agreementItem = agreementItem.toJSON()
            const addendumController = new AddendumController(agreementItem.agreementId)
            const addendum = await addendumController.getInProgressAddendum(transaction)
            let addendumId = addendum ? addendum.id : null
            let changeLogItem = await ChangeLog.getChangeLogItemDetails(agreementItem.agreementId, addendumId, resourceId, resourceType, transaction)
            let quantity = action === 'add' ? 1 : -1
            let payload = {
                id: changeLogItem ? changeLogItem.id : null,
                addendumId: addendumId,
                agreementId: agreementItem.agreementId,
                resourceType: resourceType,
                resourceId: resourceId,
                quantity: changeLogItem ? changeLogItem.quantity + quantity : quantity
            }
            if (resourceType === 'AgreementProperty' || resourceType === 'AgreementPropertyAdditionalRight') {
                payload = {
                    ...payload,
                    unitPrice: Number(agreementItem.agreementPropertyPriceDetails.unitPrice).toFixed(2),
                    totalPrice: Number(payload.quantity * agreementItem.agreementPropertyPriceDetails.unitPrice).toFixed(2)
                }
            } else {
                payload = {
                    ...payload,
                    unitPrice: Number(agreementItem.agreementItemPrice.unitPrice).toFixed(2),
                    totalPrice: Number(payload.quantity * agreementItem.agreementItemPrice.unitPrice).toFixed(2)
                }
            }
            await upsert('ChangeLog', payload, transaction)
        } catch (err) {
            console.log(err)
            logger.log('error', err)
            throw err
        }
    }

    /**
     * Add/Update or Remove action record for Cash Advanced items
     * @param {Number} payload.addendumId
     * @returns {Array} result
     * @returns {Number} result[].quantity
     * @returns {Number} result[].totalAmount
     * @returns {}
     */

    static async addOrUpdateAction (action, resourceId, resourceType, transaction) {
        try {
            const AddendumController = require('./addendum')
            let agreementItem = await models[resourceType].findOne({
                where: {
                    id: resourceId
                },
                include: [{
                    model: models.AgreementItemPrice,
                    as: 'agreementItemPrice'
                }],
                transaction
            })
            agreementItem = agreementItem.toJSON()
            const addendumController = new AddendumController(agreementItem.agreementId)
            const addendum = await addendumController.getInProgressAddendum(transaction)
            let addendumId = addendum ? addendum.id : null
            let changeLogItem = await ChangeLog.getChangeLogItemDetails(agreementItem.agreementId, addendumId, resourceId, resourceType, transaction)
            let payload = {}
            let { quantity, unitPrice, totalPrice } = agreementItem.agreementItemPrice
            if (resourceType === 'AgreementMemorialItem') {
                quantity = 1
                totalPrice = Number(quantity * unitPrice).toFixed(2)
            }
            if (changeLogItem && action === 'add' && resourceType !== 'AgreementMemorialItem') {
                changeLogItem = changeLogItem.toJSON()
                payload = {
                    id: changeLogItem.id,
                    quantity,
                    unitPrice: Number(unitPrice).toFixed(2),
                    totalPrice: Number(totalPrice).toFixed(2)
                }
            } else {
                payload = {
                    quantity: action === 'add' ? quantity : changeLogItem ? changeLogItem.quantity - quantity : -quantity,
                    unitPrice: Number(agreementItem.agreementItemPrice.unitPrice).toFixed(2),
                    totalPrice: action === 'add' ? (Number(totalPrice).toFixed(2)) : (Number(-totalPrice).toFixed(2)),
                    resourceId: resourceId,
                    resourceType: resourceType,
                    addendumId: addendumId,
                    agreementId: agreementItem.agreementId
                }
                if (changeLogItem && action !== 'add') {
                    payload.id = changeLogItem.id
                }
            }
            await upsert('ChangeLog', payload, transaction)
            return true
        } catch (err) {
            throw err
        }
    }

    /**
     * Add/Update or Remove action record for Cash Advanced items
     * @param {Number} payload.addendumId
     * @returns {Array} result
     * @returns {Number} result[].quantity
     * @returns {Number} result[].totalAmount
     * @returns {}
     */

    static async recordBulkDeleteAction (action, resourceId, resourceType, transaction) {
        try {
            let agreementItem = await models[resourceType].findOne({
                where: {
                    id: resourceId
                },
                include: [{
                    model: models.AgreementItemPrice,
                    as: 'agreementItemPrice'
                }],
                paranoid: false,
                transaction
            })
            agreementItem = agreementItem.toJSON()
            const AddendumController = require('./addendum')
            const addendumController = new AddendumController(agreementItem.agreementId)
            const addendum = await addendumController.getInProgressAddendum(transaction)
            let addendumId = addendum ? addendum.id : null
            let changeLogItem = await ChangeLog.getChangeLogItemDetails(agreementItem.agreementId, addendumId, resourceId, resourceType, transaction)
            let payload = {
                id: changeLogItem ? changeLogItem.id : null,
                resourceId: resourceId,
                resourceType: resourceType,
                addendumId: addendumId,
                agreementId: agreementItem.agreementId
            }
            let { quantity, unitPrice, totalPrice } = agreementItem.agreementItemPrice
            if (agreementItem.deletedAt && action === 'remove') {
                payload = {
                    ...payload,
                    quantity: changeLogItem ? changeLogItem.quantity - (quantity) : -quantity,
                    unitPrice: Number(agreementItem.agreementItemPrice.unitPrice).toFixed(2),
                    totalPrice: changeLogItem ? changeLogItem.totalPrice - (Number(totalPrice).toFixed(2)) : -(Number(totalPrice).toFixed(2))
                }
            } else {
                payload = {
                    ...payload,
                    quantity: action === 'add' ? quantity : changeLogItem ? changeLogItem.quantity - (quantity) : -quantity,
                    unitPrice: Number(unitPrice).toFixed(2),
                    totalPrice: action === 'add' ? Number(totalPrice).toFixed(2) : changeLogItem ? changeLogItem.totalPrice - (Number(totalPrice).toFixed(2)) : -(Number(totalPrice).toFixed(2))
                }
            }
            await upsert('ChangeLog', payload, transaction)
            return true
        } catch (err) {
            throw err
        }
    }

    /**
     * Records special order item action
     * @param {String} action
     * @param {String} resourceType
     * @param {Number} resourceId
     * @param {Object} transaction
     */
    static async recordSpecialOrderAction (action, resourceId, resourceType, transaction) {
        let agreementItem = await models[resourceType].findOne({
            where: {
                id: resourceId
            },
            transaction,
            paranoid: false
        })
        agreementItem = agreementItem.toJSON()
        let changeLogItem = await ChangeLog.getChangeLogItemDetails(agreementItem.agreementId, agreementItem.addendumId, resourceId, resourceType, transaction)
        let payload = {}
        if (changeLogItem && action === 'add') {
            changeLogItem = changeLogItem.toJSON()
            payload = {
                id: changeLogItem.id,
                quantity: agreementItem.quantity
            }
        } else {
            payload = {
                quantity: action === 'add' ? (agreementItem.quantity) : -(agreementItem.quantity),
                resourceId: resourceId,
                resourceType: resourceType,
                addendumId: agreementItem.addendumId,
                agreementId: agreementItem.agreementId
            }
        }
        await upsert('ChangeLog', payload, transaction)
    }

    static async getChangeLogItemDetails (agreementId, addendumId, resourceId, resourceType, transaction) {
        let changeLogItem = await models.ChangeLog.findOne({
            where: {
                agreementId: agreementId,
                addendumId: addendumId,
                resourceType: resourceType,
                resourceId: resourceId
            },
            transaction
        })
        return changeLogItem
    }

    static async recordAdjustmentsAction (action, agreementId, resourceId, amount, transaction) {
        try {
            const AddendumController = require('./addendum')
            const addendumController = new AddendumController(agreementId)
            const addendum = await addendumController.getInProgressAddendum(transaction)
            let addendumId = addendum ? addendum.id : null
            let resourceType = 'AgreementAdjustment'
            if (!amount && action === 'remove') {
                let adj = await models.AgreementAdjustment.findOne({
                    where: { id: resourceId },
                    transaction
                })
                amount = adj.amount
            }
            let changeLogItem = await ChangeLog.getChangeLogItemDetails(agreementId, addendumId, resourceId, resourceType, transaction)
            let payload = {
                id: changeLogItem ? changeLogItem.id : null,
                agreementId,
                addendumId,
                resourceId,
                resourceType,
                quantity: action === 'add' ? 1 : changeLogItem ? changeLogItem.quantity - 1 : -1,
                unitPrice: amount,
                totalPrice: amount
            }
            await upsert('ChangeLog', payload, transaction)
            return true
        } catch (err) {
            throw err
        }
    }
}

module.exports = ChangeLog
