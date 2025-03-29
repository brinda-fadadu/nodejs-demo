const { stripeClient } = require('../../services').stripe
const {
    findPayorCustomerId,
    createStripeCustomer,
    getPaymentCalculations
} = require('./paymentUtils')
const { PaymentTypes } = require('../../config/seed').seed
const models = require('../../models')
const moment = require('moment')

async function addCard (req) {
    const payorId = req.params.payorId
    try {
        const payer = await findPayorCustomerId(payorId)
        if (!payer.stripeCustomerId) {
            await createStripeCustomer(payer)
        }
        const card = await stripeClient.createCard(payer.stripeCustomerId, req.body.cardToken)
        return {
            id: card.id,
            last4: card.last4,
            exp_month: card.exp_month,
            exp_year: card.exp_year,
            brand: card.brand,
            name: card.name
        }
    } catch (error) {
        throw error
    }
}

async function listPayorCards (params) {
    try {
        const payer = await findPayorCustomerId(params.payorId)

        if (!payer.stripeCustomerId) {
            return []
        }
        const cards = await stripeClient.customerCards(payer.stripeCustomerId)
        const filteredRes = cards.filter(e => e.object === 'card')
        const resObj = filteredRes.map(e => {
            return {
                id: e.id,
                last4: e.last4,
                exp_month: e.exp_month,
                exp_year: e.exp_year,
                brand: e.brand,
                name: e.name
            }
        })
        return resObj
    } catch (error) {
        throw error
    }
}

async function removeCardOfPayor (params) {
    try {
        const payer = await findPayorCustomerId(params.payorId)
        if (payer && payer.stripeCustomerId) {
            const card = await stripeClient.removeCard(payer.stripeCustomerId, params.cardId)
            if (card.deleted) {
                const message = 'Card removed successfully'
                return message
            }
        } else {
            throw new Error('Payor not found')
        }
    } catch (error) {
        throw error
    }
}

// TODO: Check balance and create payment transection record
async function cardPayment (req) {
    let t = await models.sequelize.transaction()
    let reqBody = req.body
    const paymentType = Object.keys(PaymentTypes).find(e => PaymentTypes[e] === 'Card')
    try {
        const payorId = reqBody.payorId
        const statementId = reqBody.statementId
        const payer = await findPayorCustomerId(payorId)
        const paymentDetails = await getPaymentCalculations(statementId, t)
        const balance = paymentDetails.balance
        if (balance < reqBody.amount) {
            throw new Error('AMOUNT_CAN_NOT_BE_GREATER_THAN_BALANCE_AMOUNT')
        } else {
            const charge = await stripeClient.createCharge(
                payer.stripeCustomerId,
                reqBody.cardId,
                reqBody.amount
            )
            const otherInfoData = {
                'cardType': charge.payment_method_details.card.funding,
                'lastDigits': charge.payment_method_details.card.last4,
                'billingAddress': reqBody.billingInformation ? reqBody.billingInformation : {}
            }
            const otherInfo = JSON.stringify(otherInfoData)
            const updatePaymentRes = await models.Payment.create({
                statementId: statementId,
                payorId: payorId,
                transactionId: charge.id,
                amount: reqBody.amount,
                status: charge.status === 'succeeded' ? 'success' : 'failed',
                createdBy: req.currentUser.id,
                cardId: reqBody.cardId,
                receivedBy: req.currentUser.id,
                paymentType: paymentType,
                updatedAt: moment(),
                createdAt: moment(),
                otherInfo: otherInfo
            }, {
                transaction: t
            })
            await t.commit()
            return updatePaymentRes
        }
    } catch (error) {
        await t.rollback()
        throw error
    }
}

module.exports = {
    addCard,
    listPayorCards,
    removeCardOfPayor,
    cardPayment
}
