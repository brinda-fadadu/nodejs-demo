const { sendErrorResponse } = require('../../lib/errorResponse')
const ProgramController = require('../../controllers/refactorControllers/familyPortalController/programController')

module.exports = async (req, res, next) => {
    try {
        const onePortalId = req.params.onePortalId
        const result = await ProgramController.getProgram({ onePortalId })
        res.status(200).json({
            success: true,
            ...result
        })
    } catch (err) {
        sendErrorResponse(err, res)
    }
}
