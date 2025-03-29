const { customResponse } = require('../../lib/custom-response')
const { sendErrorResponse } = require('../../lib/errorResponse')
const WebCemCallController = require('../../controllers/refactorControllers/webCemController/webCemCallController')
async function getCallerDetails (req, res, next) {
    try {
        const result = await WebCemCallController.getCallerDetails(req.query)
        customResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
async function createCall (req, res, next) {
    try {
        const result = await WebCemCallController.createOrUpdateCall(req.body)
        customResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
async function getLocationOptions (req, res, next) {
    try {
        const result = await WebCemCallController.callLocations()
        customResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
async function getDecedents (req, res, next) {
    try {
        const callIdentifier = req.params.callId
        const reasonId = req.params.reasonId
        const result = await WebCemCallController.getDecedentsOrBeneficiaries(callIdentifier, reasonId)
        customResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
async function getDecedentList (req, res, next) {
    try {
        const result = await WebCemCallController.decedentSearch(req.query)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

module.exports = {
    getCallerDetails,
    createCall,
    getLocationOptions,
    getDecedents,
    getDecedentList
}
