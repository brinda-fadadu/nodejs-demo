const DecedentController = require('../../controllers/refactorControllers/familyPortalController/decedentController')
const CallFaa = require('./callFaa')
const { customResponse } = require('../../lib/custom-response')

module.exports = async (req, res, next) => {
    try {
        const decedentId = req.params.decedentId
        // post to FAA
        await CallFaa.postUnlock(decedentId)
        // update in OP
        await DecedentController.unlockDecedent({ decedentId })
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
                customResponse(400, err, res)
                break
        }
    }
}
