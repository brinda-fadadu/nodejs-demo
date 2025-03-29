const PrayerCardController = require('../../controllers/refactorControllers/familyPortalController/prayerCardController')
const CallFaa = require('./callFaa')
const { customResponse } = require('../../lib/custom-response')

module.exports = async (req, res, next) => {
    try {
        const decedentId = req.params.decedentId
        // post to FAA
        await CallFaa.unlockPrayerCard(decedentId)
        // update in OP
        await PrayerCardController.setPrayerCardLock(decedentId, false)
        res.status(200).json({
            success: true,
            message: 'OK'
        })
    } catch (err) {
        switch (err.message) {
            case 'INVALID_DECEDENT_ID':
                err.message = 'Invalid Decedent Id'
                customResponse(400, err, res)
                break
            default:
                err.message = 'Something went wrong'
                customResponse(400, err, res)
                break
        }
    }
}
