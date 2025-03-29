const { customResponse } = require('../../../lib/custom-response')
const VerifiedPersonController = require('../../../controllers/refactorControllers/personController/verifiedPersonController')
const { sendErrorResponse } = require('../../../lib/errorResponse')

async function updatePrimaryDetails (req, res, next) {
    try {
        let reqBody = req.body
        if (req.method === 'PUT') {
            reqBody.id = req.params.personId
        }
        reqBody.userId = req.currentUser.id
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const primaryDetails = await verifiedPersonController.setPrimaryDetails(req.body, req.currentUser.id)
        customResponse(200, primaryDetails, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function getPrimaryDetails (req, res, next) {
    try {
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const primaryDetails = await verifiedPersonController.getPrimaryDetails()
        customResponse(200, primaryDetails, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

module.exports = {
    updatePrimaryDetails,
    getPrimaryDetails
}
