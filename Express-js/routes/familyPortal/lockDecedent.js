const models = require('../../models')
const SyncController = require('../../controllers/refactorControllers/familyPortalController/syncController')
const CallFaa = require('./callFaa')
const { customResponse } = require('../../lib/custom-response')

module.exports = async (req, res, next) => {
    const transaction = await models.sequelize.transaction()
    try {
        const decedentId = req.params.decedentId
        const decedent = await CallFaa.pullData(decedentId)
        await SyncController.pullFromFAA({
            decedentId,
            userId: req.currentUser.id,
            decedent
        }, transaction, true)
        await transaction.commit()
        res.status(200).json({
            success: true,
            message: 'OK'
        })
    } catch (err) {
        await transaction.rollback()
        switch (err.message) {
            case 'INVALID_DECEDENT_ID':
                err.message = 'Invalid Decedent Id'
                customResponse(400, err, res)
                break
            case 'INVALID_USER_ID':
                err.message = 'Invalid User Id'
                customResponse(400, err, res)
                break
            case 'INVALID_DATA':
                err.message = 'Invalid Decedent Data'
                customResponse(400, err, res)
                break
            case 'CALL_NOT_VERIFIED':
                err.message = 'Call is not yet verified. Please try again later'
                customResponse(400, err, res)
                break
            default:
                customResponse(400, err, res)
                break
        }
    }
}
