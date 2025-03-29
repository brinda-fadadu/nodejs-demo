const { customResponse } = require('../../../lib/custom-response')
const VerifiedPersonController = require('../../../controllers/refactorControllers/personController/verifiedPersonController')
const { sendErrorResponse } = require('../../../lib/errorResponse')

async function getEducationDetails (req, res, next) {
    try {
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const educationDetails = await verifiedPersonController.getEducationDetails()
        customResponse(200, educationDetails, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function updateEducationDetails (req, res, next) {
    try {
        let reqBody = {
            ...req.body,
            userId: req.currentUser.id
        }
        if (req.method === 'PUT') {
            reqBody.id = req.params.educationId
        }
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const educationDetails = await verifiedPersonController.setEducationDetails(reqBody)
        customResponse(200, educationDetails, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

module.exports = {
    getEducationDetails,
    updateEducationDetails
}
