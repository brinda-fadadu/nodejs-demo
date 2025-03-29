const logger = require('../lib/logger')
const fs = require('fs')
const util = require('util')
const unlink = util.promisify(fs.unlink)
const { createPaymentReceipt } = require('./createPaymentReceipt')

const Email = require('../lib/Emailer/core')

async function generatePDFWorker (job, done) {
    logger.info(`Processing PDF Generator job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
    try {
        let paymentReceiptData = {}
        switch (job.data.templateName) {
        case 'paymentPrintTemplate':
            paymentReceiptData = await createPaymentReceipt(job.data.id, job.data.currentUserId, job.data.timeZone, job.data.option, job.data.templateName)
            break
        default:
            paymentReceiptData = {}
        }

        if (paymentReceiptData.pdfFile && paymentReceiptData.pdfFile !== '' && job.data.templateName === 'paymentPrintTemplate') {
            const contentchangeOnPaymentType = job.data.type === 'cashPayment' ? 'Payment for agreement' : 'Your credit card payment for agreement'
            const subjectLine = job.data.type === 'cashPayment' ? `Payment successful for agreement ${paymentReceiptData.agreementContractNumber}` : `Credit payment successful for agreement ${paymentReceiptData.agreementContractNumber}`
            const content = `Hi ${paymentReceiptData.paymentPerson},\n\n ${contentchangeOnPaymentType} ${paymentReceiptData.agreementContractNumber.trim()} of amount $${Number.parseFloat(paymentReceiptData.amount).toFixed(2)} is successful. Please contact ${paymentReceiptData.LegalName} for more information. \n\nBest Regards, \n${paymentReceiptData.LegalName}`
            await Email.sendMail(job.data.email, subjectLine, content, paymentReceiptData.pdfFile, 'Receipt.pdf', [paymentReceiptData.ccemail])
            logger.info(`email sent for payment receipt job ${JSON.stringify(job.id)}`)
            await unlink(paymentReceiptData.pdfFile)

            logger.info(`payment job success for ${JSON.stringify(job.id)}`)
            logger.info(`done job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data.id)}`)
            done(null, { success: true, jobId: job.id })
        } else {
            throw new Error('UNABLE_TO_GENERATE_PAYMENT_RECEIPT')
        }
    } catch (e) {
        logger.info(`generatepdf worker job failed ${e}`)
        console.log(e)
        done(e)
    }
}

exports.generatePDFWorker = generatePDFWorker
