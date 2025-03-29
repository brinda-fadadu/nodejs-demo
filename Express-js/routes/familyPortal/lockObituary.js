const ObituaryController = require('../../controllers/refactorControllers/familyPortalController/obituaryController')
const CallFaa = require('./callFaa')
const { sendErrorResponse } = require('../../lib/errorResponse')

module.exports = async (req, res, next) => {
    try {
        const decedentId = req.params.decedentId
        const opi = await ObituaryController.getOnePortalId(decedentId)
        // post to FAA
        if (opi) await CallFaa.lockObituary(opi)
        else throw new Error('OnePortalId Not Found')
        // update in OP
        let update = await ObituaryController.setObituaryLock(true, decedentId)
        if (update) res.status(200).json({ success: true, message: 'OK' })
        else res.status(400).json({ success: false, message: 'Unable to lock' })
    } catch (err) {
        sendErrorResponse(err, res)
    }
}
