const PayorController = require('../../controllers/refactorControllers/paymentController/payerController')
const { customResponse } = require('./../../lib/custom-response')
const { sendErrorResponse } = require('../../lib/errorResponse')
async function sendEmailPaymentRequest (req, res, next) {
    try {
        const data = req.body
        data.userId = req.currentUser.id
        data.currentUserEmail = req.currentUser.email
        const payorController = new PayorController(req.body.payorId)
        payorController.setResource(req.body.resourceId)
        const result = await payorController.sendPaymentRequestEmail(data)
        customResponse(200, {
            result,
            message: 'Payment request sent successfully.'
        }, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

module.exports = {
    sendEmailPaymentRequest
}
