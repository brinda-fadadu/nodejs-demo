const { customResponse } = require('../../../lib/custom-response')
const VerifiedPersonController = require('../../../controllers/refactorControllers/personController/verifiedPersonController')
const { sendErrorResponse } = require('../../../lib/errorResponse')

async function getVeteranDetails (req, res, next) {
    try {
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const veteranDetails = await verifiedPersonController.getVeteranDetails()
        customResponse(200, veteranDetails, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function updateVeteranDetails (req, res, next) {
    try {
        let reqBody = {
            ...req.body,
            userId: req.currentUser.id
        }
        if (req.method === 'PUT') {
            reqBody.id = req.params.veteranId
        }
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const veteranDetails = await verifiedPersonController.setVeteranDetails(reqBody)
        customResponse(200, veteranDetails, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

module.exports = {
    getVeteranDetails,
    updateVeteranDetails
}
