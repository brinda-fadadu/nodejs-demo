const logger = require('../../lib/logger')
const { customResponse } = require('../../lib/custom-response')
const { sendErrorResponse } = require('../../lib/errorResponse')
const Controller = require('../../controllers/refactorControllers/chapelController/chapelController')
async function getListOfChapels (req, res) {
    try {
        const result = await Controller.getListOfChapels(req.query)
        customResponse(200, result, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

async function getAvailabilityOfChapel (req, res) {
    try {
        let agreementAdjustments = await Controller.getAvailabilityOfChapel(req.query)
        customResponse(200, agreementAdjustments, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

module.exports = {
    getListOfChapels,
    getAvailabilityOfChapel
}
