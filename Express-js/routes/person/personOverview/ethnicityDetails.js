const { customResponse } = require('../../../lib/custom-response')
const VerifiedPersonController = require('../../../controllers/refactorControllers/personController/verifiedPersonController')
const { sendErrorResponse } = require('../../../lib/errorResponse')

async function getEthnicityDetails (req, res, next) {
    try {
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const ethnicityDetails = await verifiedPersonController.getEthnicityDetails()
        customResponse(200, ethnicityDetails, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function updateEthnicityDetails (req, res, next) {
    try {
        let reqBody = {
            ...req.body,
            userId: req.currentUser.id
        }
        if (req.method === 'PUT') {
            reqBody.id = req.params.ethnicityId
        }
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const ethnicityDetails = await verifiedPersonController.setEthnicityDetails(reqBody)
        customResponse(200, ethnicityDetails, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

module.exports = {
    getEthnicityDetails,
    updateEthnicityDetails
}
