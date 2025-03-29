const { sendErrorResponse } = require('../../lib/errorResponse')
const PrayerCardController = require('../../controllers/refactorControllers/familyPortalController/prayerCardController')

module.exports = async (req, res, next) => {
    try {
        const onePortalId = req.params.onePortalId
        const result = await PrayerCardController.getPrayerCard({ onePortalId })
        res.status(200).json({
            success: true,
            ...result
        })
    } catch (err) {
        sendErrorResponse(err, res)
    }
}
