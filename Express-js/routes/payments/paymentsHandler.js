// const cardAndDigitalPayment = require('../../controllers/payments/digitalPayment')
const PayorController = require('./../../controllers/refactorControllers/paymentController/payerController')
const { sendErrorResponse } = require('../../lib/errorResponse')
const { customResponse } = require('./../../lib/custom-response')
const { queueNames, queues } = require('../../appQueues')
const generatePDFWorker = queues[queueNames.generate_PDF_queue]
const logger = require('./../../lib/logger')
const { bullJobRetry } = require('../../lib/util')
const fs = require('fs')
const util = require('util')
const unlink = util.promisify(fs.unlink)
const { createPaymentReceipt } = require('../../appQueues/createPaymentReceipt')

// This API will serve for cash, check, moneyorder and void check payments.
async function createPaymentHandler (req, res, next) {
    try {
        if (req.body.paymentType === 7 && req.body.amount > 0) {
            throw new Error('VOID_CHECK_AMOUNT_CANT_BE_NONZERO')
        } else if (req.body.paymentType !== 7 && req.body.amount === 0) {
            throw new Error('PAID_AMOUNT_CANT_BE_ZERO')
        }

        const reqBody = {
            ...req.body
        }
        reqBody.createdBy = req.currentUser.id
        reqBody.receivedBy = req.currentUser.id
        reqBody.updatedAt = new Date()
        reqBody.createdAt = new Date()
        const payorController = new PayorController(reqBody.payorId)
        payorController.setResource(reqBody.resourceId)
        const cashPayment = await payorController.createCashPayment(reqBody)
        customResponse(200, cashPayment, res)
        let paymentRes = {
            id: cashPayment.id,
            currentUserId: req.currentUser.id,
            templateName: 'paymentPrintTemplate',
            agreementId: cashPayment.resourceId,
            option: { pageSize: 'A4' },
            pdfName: 'Receipt.pdf',
            email: cashPayment.payorEmail || req.currentUser.email,
            type: 'cashPayment',
            timeZone: reqBody.timeZone
        }
        if (cashPayment.partnerId) {
            paymentRes.showPurchasers = false
        }
        generatePDFWorker.add('generatePDFWorker', paymentRes, bullJobRetry)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function listPaymentsByStatement (req, res, next) {
    try {
        const data = {
            ...req.query
        }
        const payorController = new PayorController(data.payorId)
        payorController.setResource(data.resourceId)
        const result = await payorController.getListPayments()
        customResponse(200, {
            payments: result
        }, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function sendPaymentRequestEmail (req, res, next) {
    try {
        const data = req.body
        data.userId = req.currentUser.id
        const payorController = new PayorController(req.params.payorId)
        payorController.setResource(req.params.agreementId)
        const result = await payorController.sendPaymentRequestEmail(req.body)
        customResponse(200, {
            result,
            message: 'Payment request sent successfully.'
        }, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function stripeWebhookHandler (req, res) {
    try {
        let payorId = req.body.data.object.metadata.payorId
        if (req.body.data.object.metadata.partnerId) {
            payorId = req.body.data.object.metadata.partnerId
        }
        const payorController = new PayorController(payorId)
        payorController.setResource(req.body.data.object.metadata.resourceId)
        const paymentResponse = await payorController.stripeWebhookHandler(req.body, req.body.data.object.metadata.currentUserId)
        customResponse(200, { paymentResponse }, res)
    } catch (err) {
        logger.info(`Payments webhook API Failed`)
        sendErrorResponse(err, res)
    }
}

async function getCartDetails (req, res, next) {
    try {
        const data = {
            ...req.query
        }
        const payorController = new PayorController(data.payorId)
        payorController.setResource(data.resourceId)
        const payment = await payorController.getCartDetails()
        customResponse(200, {
            payment
        }, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function voidPayment (req, res, next) {
    try {
        let payload = req.body
        payload.id = req.params.paymentId
        payload.status = 'voided'
        payload.voidedTime = new Date()
        const voidedPayment = await PayorController.voidPayment(payload, req.currentUser)
        customResponse(200, { voidedPayment }, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function downloadPaymentReceiptHandler (req, res, next) {
    try {
        const timeZone = req.query.timezone
        let paymentId = req.params.paymentId
        const currentUserId = req.currentUser.id
        const createPaymentReceiptData = await createPaymentReceipt(paymentId, currentUserId, timeZone, { pageSize: 'A4' }, 'paymentPrintTemplate')
        if (createPaymentReceiptData.pdfFile !== '') {
            var stat = fs.statSync(createPaymentReceiptData.pdfFile)
            res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-Length': stat.size
            })
            fs.createReadStream(createPaymentReceiptData.pdfFile).pipe(res)
            await unlink(createPaymentReceiptData.pdfFile)
        } else {
            var noReceiptError = new Error('UNABLE_TO_GENERATE_PAYMENT_RECEIPT')
            sendErrorResponse(noReceiptError, res)
        }
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function refreshPayment (req, res, next) {
    try {
        let payload = req.body
        payload.id = req.params.paymentId
        const payorController = new PayorController()
        const refreshPayment = await payorController.refreshPayment(payload)
        customResponse(200, { refreshPayment }, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

module.exports = {
    createPaymentHandler,
    listPaymentsByStatement,
    sendPaymentRequestEmail,
    stripeWebhookHandler,
    getCartDetails,
    voidPayment,
    downloadPaymentReceiptHandler,
    refreshPayment
}
