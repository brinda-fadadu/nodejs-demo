const {
    sendErrorResponse
} = require('../../lib/errorResponse')
const { customResponse } = require('./../../lib/custom-response')

const PayorController = require('../../controllers/refactorControllers/paymentController/payerController')
async function listPayerCards (req, res, next) {
    try {
        const payorController = new PayorController(req.params.payorId)
        payorController.setResource(req.query.resourceId)
        const cardsRes = await payorController.listPayorCards()
        customResponse(200, { card: cardsRes }, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function addCardForAPayor (req, res, next) {
    try {
        const payorController = new PayorController(req.params.payorId)
        payorController.setResource(req.body.resourceId)
        const card = await payorController.addCard(req.body.cardToken)
        customResponse(200, { card }, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function deleteCardOfPayor (req, res, next) {
    try {
        const payorController = new PayorController(req.params.payorId)
        payorController.setResource(req.query.resourceId)
        const deletedRes = await payorController.removeCardOfPayor(req.params.cardId)
        customResponse(200, { message: deletedRes }, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function cardPaymentHandler (req, res, next) {
    try {
        const payorController = new PayorController(req.body.payorId)
        payorController.setResource(req.body.resourceId)
        const payment = await payorController.cardPayment(req.body, req.currentUser)
        customResponse(200, { payment }, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

module.exports = {
    listPayerCards,
    addCardForAPayor,
    deleteCardOfPayor,
    cardPaymentHandler
}
