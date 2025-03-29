const ServiceController = require('../../controllers/refactorControllers/familyPortalController/serviceController')
const { customResponse } = require('../../lib/custom-response')

module.exports = async (req, res, next) => {
    try {
        const onePortalId = req.params.onePortalId
        const result = await ServiceController.getInterestedServices({ onePortalId })
        res.status(200).json({
            success: true,
            ...result
        })
    } catch (err) {
        if (err.message === 'INVALID_ONE_PORTAL_ID') {
            err.message = 'Invalid One Portal Id'
            customResponse(400, err, res)
        } else {
            err.message = 'Something went wrong'
            customResponse(400, err, res)
        }
    }
}
