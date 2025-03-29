const AgreementItemController = require('../../controllers/refactorControllers/agreementController/agreementItemController')
const AgreementController = require('../../controllers/refactorControllers/agreementController/agreementController')
const { customResponse } = require('../../lib/custom-response')
const { sendErrorResponse } = require('../../lib/errorResponse')

// locationItemId, removeAll, itemType
async function createOrEditAgreementItems (req, res, next) {
    try {
        let data = req.body
        data.userId = req.currentUser.id
        const { agreementId, action } = req.params
        const agreementItemController = new AgreementItemController(agreementId)
        const agreementItem = await agreementItemController.createOrUpdate(action, req.body)
        customResponse(200, agreementItem, res)
    } catch (error) {
        console.log(error)
        sendErrorResponse(error, res)
    }
}
async function listAgreementItems (req, res, next) {
    try {
        const { agreementId } = req.params
        const agreementItemController = new AgreementItemController(agreementId)
        const responseObject = await agreementItemController.listAllAgreementItems(req)
        customResponse(200, responseObject, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function addPayors (req, res, next) {
    try {
        req.body.userId = req.currentUser.id
        const agreementController = new AgreementController(req.params.agreementId)
        const agreements = await agreementController.addPayor(req.body)
        customResponse(200, agreements, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function updatePayor (req, res, next) {
    try {
        const agreementController = new AgreementController(req.params.agreementId)
        req.body.payorId = req.params.payorId
        const agreements = await agreementController.updatePayor(req.body, req.currentUser.id)
        customResponse(200, agreements, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function getPayors (req, res, next) {
    try {
        const { agreementId } = req.params
        const agreementController = new AgreementController(agreementId)
        const agreements = await agreementController.getPayors()
        customResponse(200, agreements, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
async function deletePayor (req, res, next) {
    try {
        const { agreementId, payorId } = req.params
        const agreementController = new AgreementController(agreementId)
        const agreements = await agreementController.deletePayor(payorId)
        customResponse(200, agreements, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function markAgreementComplete (req, res, next) {
    try {
        const agreementController = new AgreementController(req.params.agreementId)
        const result = await agreementController.markAgreementComplete()
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function downloadFuneralAgreementInvoice (req, res) {
    try {
        const agreementItemController = new AgreementItemController(req.params.agreementId)
        await agreementItemController.downloadAgreementInvoice(req.params.agreementId, req.query.timezone, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

module.exports = {
    listAgreementItems,
    createOrEditAgreementItems,
    addPayors,
    getPayors,
    deletePayor,
    markAgreementComplete,
    updatePayor,
    downloadFuneralAgreementInvoice
}
