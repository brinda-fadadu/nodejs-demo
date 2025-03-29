const VerifiedPersonController = require('../../controllers/refactorControllers/personController/verifiedPersonController')
const { customResponse } = require('../../lib/custom-response')
const { sendErrorResponse } = require('../../lib/errorResponse')

async function createArrangement (req, res, next) {
    try {
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        let result = await verifiedPersonController.createArrangement(req.currentUser.id)
        customResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function getArrangement (req, res, next) {
    try {
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        let arrangement = await verifiedPersonController.getArrangement()
        customResponse(200, arrangement, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

module.exports = {
    getArrangement,
    createArrangement
}
