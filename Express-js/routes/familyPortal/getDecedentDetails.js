const DecedentController = require('../../controllers/refactorControllers/familyPortalController/decedentController')
const { customResponse } = require('../../lib/custom-response')

const decedentInfoHandler = async (req, res, next) => {
    try {
        const decedentId = req.params.decedentId
        const result = await DecedentController.getDecedentInfo({
            id: decedentId
        })
        customResponse(200, result, res)
    } catch (err) {
        if (err.message === 'INVALID_DECEDENT_ID') {
            err.message = 'Invalid Decedent Id'
            customResponse(400, err, res)
        } else {
            customResponse(400, err, res)
        }
    }
}

const getDecedentDetails = async (req, res, next) => {
    try {
        const onePortalId = req.params.onePortalId
        const result = await DecedentController.getDecedentDetails(onePortalId)
        customResponse(200, result, res)
    } catch (err) {
        customResponse(400, err, res)
    }
}

module.exports = {
    decedentInfoHandler,
    getDecedentDetails
}
