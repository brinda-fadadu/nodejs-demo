const PersonController = require('../../controllers/refactorControllers/personController/personController')
const { customResponse } = require('../../lib/custom-response')
const { sendErrorResponse } = require('../../lib/errorResponse')

async function advanceSearchHandler (req, res, next) {
    try {
        const result = await PersonController.advanceSearch(req.body)
        customResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

module.exports = advanceSearchHandler
