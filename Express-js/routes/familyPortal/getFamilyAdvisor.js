const AdvisorController = require('../../controllers/refactorControllers/familyPortalController/advisorController')
const { customResponse } = require('../../lib/custom-response')

module.exports = async (req, res, next) => {
    try {
        const onePortalId = req.params.onePortalId
        const result = await AdvisorController.getFamilyAdvisor({
            onePortalId
        })
        res.status(200).json({
            success: true,
            data: result
        })
    } catch (err) {
        if (err.message === 'INVALID_ONE_PORTAL_ID') {
            err.message = 'Invalid one Portal Id'
            customResponse(400, err, res)
        } else {
            customResponse(400, err, res)
        }
    }
}
