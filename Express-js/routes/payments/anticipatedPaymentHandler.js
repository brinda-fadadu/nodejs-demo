const { sendErrorResponse } = require('../../lib/errorResponse')
const { customResponse } = require('./../../lib/custom-response')
const PayorController = require('./../../controllers/refactorControllers/paymentController/payerController')
// const { addAnticipatedPaymentHandler, getAnticipatedPaymentsHandler, addReceiveAmountHandler } = require('../../controllers/payments/anticipatedPayment')

async function addAnticipatedPayment (req, res) {
    try {
        const payorController = new PayorController()
        payorController.setResource(req.body.resourceId)
        req.body.createdBy = req.currentUser.id
        const result = await payorController.addAnticipatedPayment(req.body)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function getAnticipatedPayments (req, res) {
    try {
        const payorController = new PayorController()
        payorController.setResource(req.query.resourceId)
        const result = await payorController.getAnticipatedPayments()
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function addReceiveAmount (req, res) {
    try {
        req.body.createdBy = req.body.receivedBy = req.currentUser.id
        const payorController = new PayorController()
        const result = await payorController.addReceiveAmount(req.body)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

module.exports = {
    addAnticipatedPayment,
    getAnticipatedPayments,
    addReceiveAmount
}
