const logger = require('../lib/logger')
const Email = require('../lib/Emailer/core')

async function stripePaymentEmailWorker (job, done) {
    logger.info(`Processing Stripe Payment Email job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
    try {
        let data = job.data
        const content = `Please use the following link to make Payment for agreement ${data.contractNumber}:  ${data.hosted_invoice_url}`
        await Email.sendMail(data.customer_email, data.subject, content)
        logger.info(`Done Stripe Payment Email job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
        done(null, { data: job.data })
    } catch (e) {
        logger.error(e)
        done(e)
    }
}

module.exports = {
    stripePaymentEmailWorker
}
