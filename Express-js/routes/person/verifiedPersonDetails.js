const VerifiedPersonController = require('../../controllers/refactorControllers/personController/verifiedPersonController')
const sendResponse = require('../../lib/custom-response')

async function getPersonDetails (req, res, next) {
    try {
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const personDetails = await verifiedPersonController.getVerifiedPerson()
        res.status(200).json({
            success: true,
            data: personDetails
        })
    } catch (error) {
        sendResponse(error, res)
    }
}

module.exports = {
    getPersonDetails
}
