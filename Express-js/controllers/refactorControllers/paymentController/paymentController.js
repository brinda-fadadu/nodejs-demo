const models = require('./../../../models')
// const AgreementController = require('./../agreementController/agreementController')
const Sequelize = require('sequelize')
const op = Sequelize.Op
const logger = require('../../../lib/logger')
class PaymentController {
    /**
     * getting the receipt number
     * @param {Number} resourceId id of the agreement to which we have to fetch the arrangement type
     * @param {*} t
     */
    static async getArrangementTypeAndCreateReceiptNo (resourceId, t) {
        const AgreementController = require('./../agreementController/agreementController')
        try {
            let prefix
            const agreementInfo = await AgreementController.getArrangementType(
                resourceId,
                t
            )
            prefix = await this.getRecipetPrefixCode(agreementInfo, t)
            let receiptNumber
            let paymentCounter = await models.PaymentCounter.findOne({
                where: { receiptNumberPrefix: prefix }, transaction: t })
            if (paymentCounter) {
                receiptNumber = paymentCounter.value
            } else {
                const receiptNumberCounter = await models.Payment.findOne({
                    where: { receiptNumber: { [op.like]: `${prefix}%` } },
                    attributes: ['receiptNumber'],
                    limit: 1,
                    order: [['createdAt', 'DESC']],
                    transaction: t
                })
                if (receiptNumberCounter) { receiptNumber = Number(receiptNumberCounter.dataValues.receiptNumber.slice(3, receiptNumberCounter.dataValues.receiptNumber.length)) }
            }
            let secondHalf
            if (receiptNumber) {
                if (isNaN(receiptNumber)) {
                    secondHalf = String(1).padStart(8, '0')
                    receiptNumber = prefix.concat('', secondHalf)
                } else {
                    secondHalf = String(receiptNumber + 1).padStart(8, '0')
                    receiptNumber = prefix.concat('', secondHalf)
                }
            } else {
                secondHalf = String(1).padStart(8, '0')
                receiptNumber = prefix.concat('', secondHalf)
            }
            if (!paymentCounter) {
                await models.PaymentCounter.create({
                    receiptNumberPrefix: prefix,
                    value: Number(secondHalf)
                },
                {
                    transaction: t
                }
                )
            } else {
                await models.PaymentCounter.update({
                    value: Number(secondHalf)
                },
                {
                    where: { id: paymentCounter.id },
                    transaction: t
                })
            }
            return receiptNumber
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     *
     * @param {Object} agreementInfo details of the agreement
     * @param {string} agreementInfo.arrangementType
     * @param {number} agreementInfo.locationId
     * @param {*} transaction
     */
    static async getRecipetPrefixCode (agreementInfo, transaction) {
        let prefix, location
        if (
            agreementInfo.arrangementType === 'PN' &&
      agreementInfo.agreementType === 'Funeral'
        ) {
            prefix = 'PNF'
        } else {
            location = await models.Location.findOne({
                where: {
                    id: agreementInfo.locationId
                }
            }, {
                transaction
            })
            prefix = location.code
        }
        return prefix
    }
}
module.exports = PaymentController
