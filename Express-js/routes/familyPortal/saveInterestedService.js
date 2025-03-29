const models = require('../../models')
const ServiceController = require('../../controllers/refactorControllers/familyPortalController/serviceController')
const { customResponse } = require('../../lib/custom-response')

module.exports = async (req, res, next) => {
    const transaction = await models.sequelize.transaction()
    try {
        const decedentId = req.params.decedentId
        const result = await ServiceController.saveInterestedService(decedentId, req.body, transaction)
        await transaction.commit()
        res.status(200).json({
            success: true,
            ...result
        })
    } catch (err) {
        await transaction.rollback()
        switch (err.message) {
            case 'INVALID_DECEDENT_ID':
                err.message = 'Invalid Decedent Id'
                customResponse(400, err, res)
                break
            case 'INVALID_SERVICE_NAME':
                err.message = 'Invalid service name'
                customResponse(400, err, res)
                break
            case 'INVALID_SERVICE_DESCRIPTION':
                err.message = 'Invalid service description'
                customResponse(400, err, res)
                break
            case 'INTEREST_ALREADY_SAVED':
                err.message = 'Interest already saved'
                customResponse(400, err, res)
                break
            default:
                err.message = 'Something went wrong'
                customResponse(400, err, res)
                break
        }
    }
}
