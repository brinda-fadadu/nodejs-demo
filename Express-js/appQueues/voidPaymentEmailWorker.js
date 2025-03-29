const logger = require('../lib/logger')
const Email = require('../lib/Emailer/core')

async function voidPaymentEmailWorker (job, done) {
    try {
        const { to, contractNo, payerName, benificiaryOPIs, amount, referenceNumber, paymentType, voidedRemarks, cc } = job.data

        const subject = `Payment voided for agreement ${contractNo}`
        const content = `Hi ${payerName},
            Payment for agreement ${contractNo} (Beneficiary/Decedent: ${benificiaryOPIs}) of amount $${amount} (${paymentType}) with payment id: ${referenceNumber} is voided. \nRemarks: ${voidedRemarks}. \nPlease contact Brand Name for more information.
        
            - Brand Name`
        Email.sendMail(to, subject, content, null, null, cc)
        done(null, { data: job.data })
    } catch (error) {
        logger.error(error)
        done(error)
    }
}
module.exports = {
    voidPaymentEmailWorker
}
