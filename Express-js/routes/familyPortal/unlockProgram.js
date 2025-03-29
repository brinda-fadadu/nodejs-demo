const ProgramController = require('../../controllers/refactorControllers/familyPortalController/programController')
const CallFaa = require('./callFaa')
const { sendErrorResponse } = require('../../lib/errorResponse')

module.exports = async (req, res, next) => {
    try {
        const decedentId = req.params.decedentId
        // post to FAA
        await CallFaa.unlockProgram(decedentId)
        // update in OP
        await ProgramController.setProgramLock(decedentId, false)
        res.status(200).json({
            success: true,
            message: 'OK'
        })
    } catch (err) {
        sendErrorResponse(err, res)
    }
}
