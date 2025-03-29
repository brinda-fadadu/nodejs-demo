const models = require('../../models')
const { getPaymentCalculations } = require('./paymentUtils')
const util = require('../../lib/util')
const { seed } = require('../../config/seed')
const { createPayment } = require('./createPayment')
const _ = require('underscore')

async function addAnticipatedPaymentHandler (reqData) {
    try {
        const stmtId = reqData.statementId
        const statmentCheck = await statementCheck(stmtId)
        const orgCheck = await models.Organization.findOne({ where: { id: reqData.organizationId } })
        if (statmentCheck && orgCheck) {
            await models.AnticipatedPayment.create(reqData)
            return { 'anticipatedPayments': await getListOfAnticipated(stmtId) }
        } else {
            throw new Error('Statement OR Organization not found')
        }
    } catch (error) {
        throw error
    }
}
async function getAnticipatedPaymentsHandler (statementId) {
    try {
        return { 'anticipatedPayments': await getListOfAnticipated(statementId) }
    } catch (error) {
        throw error
    }
}

async function addReceiveAmountHandler (data) {
    try {
        let anticipatedPayment = await checkAnticipatedPayment(data.anticipatedPaymentId)
        if (anticipatedPayment) {
            let outcome = await models.sequelize.transaction(async (t) => {
                let paymentTypes = seed.PaymentTypes
                data.paymentType = util.getKey(paymentTypes, 'Anticipated payment')
                data.organizationId = anticipatedPayment.organizationId
                data.createdAt = data.updatedAt = new Date()
                data.statementId = anticipatedPayment.statementId
                let payment = await createPayment(data, t)
                await models.AnticipatedPayment.update({ paymentId: payment.id, receivedAt: data.receivedAt },
                    {
                        where: { id: data.anticipatedPaymentId },
                        transaction: t
                    }
                )
                let result = await models.AnticipatedPayment.findOne({
                    where: { id: data.anticipatedPaymentId },
                    include: [{
                        model: models.Payment,
                        as: 'payment'
                    }],
                    transaction: t
                })
                return result
            })
            let paymentCalculations = await getPaymentCalculations(anticipatedPayment.statementId)
            let finalResult = outcome.toJSON()
            finalResult.totalAmount = paymentCalculations.totalAmount
            finalResult.totalPaid = paymentCalculations.totalPaid
            finalResult.balance = paymentCalculations.balance
            return { anticipatedPayment: finalResult }
        } else {
            throw new Error('Anticipated Payment not found')
        }
    } catch (error) {
        throw error
    }
}

function statementCheck (stmtId) {
    return models.Statement.findOne({ where: { id: stmtId } })
}

function checkAnticipatedPayment (anticipatedPaymentId) {
    return models.AnticipatedPayment.findOne({ where: { id: anticipatedPaymentId } })
}

async function getListOfAnticipated (statementId) {
    let result = await models.AnticipatedPayment.findAll({
        where: { statementId },
        include: [
            {
                model: models.Payment,
                as: 'payment'
            },
            {
                model: models.Organization,
                as: 'organization',
                attributes: ['name']
            }
        ]
    })
    let finalResult = _.map(JSON.parse(JSON.stringify(result)), function (res) {
        res.organizationName = res.organization.name
        delete res.organization
        return res
    })
    return finalResult
}

module.exports = {
    addAnticipatedPaymentHandler,
    getAnticipatedPaymentsHandler,
    addReceiveAmountHandler
}
