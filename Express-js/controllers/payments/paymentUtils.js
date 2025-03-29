const models = require('../../models')
const _ = require('underscore')
const { stripeClient } = require('../../services').stripe

async function getPaymentCalculations (statementId, t) {
    try {
        const statementDetails = await models.Statement.getPaymentDetails(statementId, t)
        let paymentObj = {}
        if (statementDetails) {
            const paymentsDoneTillNow = statementDetails.Payments.map(e => {
                return e.amount
            })
            const sumOfAmountsPaid = _.reduce(paymentsDoneTillNow, (memo, num) => {
                return memo + num
            }, 0)
            paymentObj.totalPaid = sumOfAmountsPaid
            paymentObj.balance = statementDetails.finalAmount - sumOfAmountsPaid
            paymentObj.totalAmount = statementDetails.finalAmount
            return paymentObj
        } else {
            throw new Error('STATEMENT_NOT_FOUND')
        }
    } catch (error) {
        throw error
    }
}
async function getArrangementTypeAndCreateReceiptNo (statementId, t) {
    try {
        let prefix, location
        const statementInfo = await models.Statement.getArrangementType(statementId, t)
        if (statementInfo.arrangementType === 'PN' && statementInfo.agreementType === 'funeral') {
            prefix = 'PNF'
        } else {
            location = await models.Location.findOne({ where:
                 {
                    id: statementInfo.locationId
                }
            })
            prefix = location.Code
        }
        const receiptNumberCounter = await models.ReceiptNumberCounter.findOne({
            where: { prefix: prefix },
            transaction: t
        })
        await receiptNumberCounter.increment('value', { transaction: t })
        const secondHalf = String(receiptNumberCounter.value + 1).padStart(8, '0')
        const receiptNumber = prefix.concat('',
            secondHalf
        )
        return receiptNumber
    } catch (error) {
        throw error
    }
}

async function checkStripeCustomerExistsOrNot (payorId, statementId) {
    try {
        const payer = await models.PersonInfo.findOne({
            where: {
                personId: payorId
            }
        })
        if (payer) {
            return payer
        } else {
            throw new Error('PAYER_OR_STATEMENT_NOT_FOUND')
        }
    } catch (error) {
        throw error
    }
}

async function findPayor (payorId, statementId) {
    try {
        const payer = await models.AgreementPerson.findOne({
            where: {
                personId: payorId,
                statementId: statementId
            }
        })
        if (payer) {
            return payer
        } else {
            throw new Error('PAYER_OR_STATEMENT_NOT_FOUND')
        }
    } catch (error) {
        throw error
    }
}

async function createStripeCustomer (payer) {
    try {
        const person = await payer.getPerson()
        const customer = await stripeClient.createCustomer(person)
        await payer.update({ stripeCustomerId: customer.id })
    } catch (error) {
        throw error
    }
}

async function findPayorCustomerId (payorId) {
    try {
        const payor = await models.PersonInfo.findOne({
            where: {
                personId: payorId
            }
        })
        if (payor) {
            return payor
        } else {
            throw new Error('PAYOR_NOT_FOUND')
        }
    } catch (error) {
        throw error
    }
}

module.exports = {
    getPaymentCalculations,
    getArrangementTypeAndCreateReceiptNo,
    createStripeCustomer,
    findPayorCustomerId,
    checkStripeCustomerExistsOrNot,
    findPayor
}
