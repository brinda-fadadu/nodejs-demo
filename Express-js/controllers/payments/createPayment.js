const models = require('../../models')
const {
    getPaymentCalculations,
    findPayor,
    getArrangementTypeAndCreateReceiptNo
} = require('./paymentUtils')

async function createNormalPayment (reqBody, t) {
    try {
        // function to find if the payor and statement exists
        const payorExists = await findPayor(reqBody.payorId, reqBody.statementId)

        // function to check if the amount is less than or equal to balance
        const isAmountValid = await checkAmountAndBalance(reqBody.statementId, reqBody.amount)

        if (payorExists && isAmountValid) {
            const payment = await createPayment(reqBody, t)
            let paymentRes = payment.toJSON()
            let paymentCalculations = await getPaymentCalculations(reqBody.statementId, t)
            paymentRes.totalAmount = paymentCalculations.totalAmount
            paymentRes.totalPaid = paymentCalculations.totalPaid
            paymentRes.balance = paymentCalculations.balance
            return paymentRes
        }
    } catch (error) {
        console.log(error)
        throw error
    }
}

async function createPayment (reqBody, t) {
    // function to generate receiptNumber and create payment
    const receiptNumber = await getArrangementTypeAndCreateReceiptNo(reqBody.statementId, t)
    reqBody.receiptNumber = receiptNumber
    reqBody.status = 'success'
    const payment = await models.Payment.addPayment(reqBody, t)
    return payment
}

async function checkAmountAndBalance (statementId, amount) {
    const paymentDetails = await getPaymentCalculations(statementId)
    if (amount > paymentDetails.balance) {
        throw new Error('AMOUNT_CAN_NOT_BE_GREATER_THAN_BALANCE_AMOUNT')
    }
    return true
}

async function listPayments (data) {
    try {
        const result = await models.Payment.getByStatementAndPayor(data)
        return result
    } catch (err) {
        throw err
    }
}

module.exports = {
    createNormalPayment,
    createPayment,
    listPayments
}
