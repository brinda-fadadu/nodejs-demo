const AgreementController = require('../../controllers/refactorControllers/agreementController/agreementPackageController')
const { customResponse } = require('../../lib/custom-response')
const { sendErrorResponse } = require('../../lib/errorResponse')
const AgreementPackageController = require('../../controllers/refactorControllers/agreementController/agreementPackageController')

async function addOrRemovePackage (req, res, next) {
    try {
        const { agreementId, action } = req.params
        const payload = req.body
        payload.agreementId = agreementId
        payload.userId = req.currentUser.id
        const agreementController = new AgreementController(payload.agreementId)
        const result = await agreementController.createOrUpdatePackage(payload, action)
        customResponse(201, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function listAgreementPackageItems (req, res, next) {
    try {
        const { agreementPackageId } = req.params
        const result = await AgreementPackageController.getAgreementPackageItems(agreementPackageId)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

module.exports = {
    addOrRemovePackage,
    listAgreementPackageItems
}
