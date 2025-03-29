const models = require('../../models')
const ProgramController = require('../../controllers/refactorControllers/familyPortalController/programController')
const { sendErrorResponse } = require('../../lib/errorResponse')

module.exports = async (req, res, next) => {
    const transaction = await models.sequelize.transaction()
    try {
        const decedentId = req.params.decedentId
        await ProgramController.saveProgram(decedentId, req.body, transaction)
        await transaction.commit()
        res.status(200).json({
            success: true,
            message: 'OK'
        })
    } catch (err) {
        await transaction.rollback()
        sendErrorResponse(err, res)
    }
}
