const PersonController = require('../../controllers/refactorControllers/personController/personController')
const { customResponse } = require('../../lib/custom-response')
const { sendErrorResponse } = require('../../lib/errorResponse')

async function simpleSearchHandler (req, res, next) {
    try {
        const result = await PersonController.simpleSearch(req.query)
        customResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function personSearchByOpiHandler (req, res, next) {
    try {
        const result = await new PersonController().personElasticSearchByOpi(req.query)
        customResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

module.exports = {
    simpleSearchHandler: simpleSearchHandler,
    personSearchByOpiHandler: personSearchByOpiHandler
}
