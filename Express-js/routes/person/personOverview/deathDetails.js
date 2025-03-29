const { customResponse } = require('../../../lib/custom-response')
const VerifiedPersonController = require('../../../controllers/refactorControllers/personController/verifiedPersonController')
const { sendErrorResponse } = require('../../../lib/errorResponse')

async function getDeathInfoDetails (req, res, next) {
    try {
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const deathDetails = await verifiedPersonController.getDeathDetails()
        customResponse(200, deathDetails, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function updateDeathInfoDetails (req, res, next) {
    try {
        let reqBody = req.body
        reqBody.userId = req.currentUser.id
        if (req.method === 'PUT') {
            reqBody.id = req.params.deathDetailsId
        }
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)

        const deathDetails = await verifiedPersonController.setDeathDetails(reqBody)
        customResponse(200, deathDetails, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

module.exports = {
    getDeathInfoDetails,
    updateDeathInfoDetails
}
