const { stripeClient } = require('../../services').stripe
const {
    checkStripeCustomerExistsOrNot,
    createStripeCustomer
} = require('./paymentUtils')

// Digital Payment
async function sendPaymentRequestEmail (data) {
    const payer = await checkStripeCustomerExistsOrNot(data.payorId, data.statementId)
    // const person = await payer.getAgreementPersonDetails()

    if (!payer.stripeCustomerId) {
        await createStripeCustomer(payer)
    }
    const paymentRes = await stripeClient.sendPaymentRequestEmail(
        payer.stripeCustomerId,
        data.amount,
        "Statement payment for Me x 'StatementNumber'",
        { statementId: data.statementId }
    )

    return paymentRes
}

// TODO: Update payment status and balance
async function stripePaymentWebhook (reqBody) {
    return true
}

module.exports = {
    sendPaymentRequestEmail,
    stripePaymentWebhook
}
