const { customResponse } = require('../../lib/custom-response')
const logger = require('../../lib/logger')
const Controller = require('../../controllers/refactorControllers/daySheetController/cemeteryDaySheetController')
const FuneralController = require('../../controllers/refactorControllers/daySheetController/funeralDaySheetController')

async function getDaySheets (req, res) {
    try {
        let result = []
        let q = req.query
        if (q && q.agreementType === 'cemetery') {
            result = await Controller.getCemeteryDaySheet(q.serviceFromDate, q.serviceToDate, q.locations, q.timezone, true, q.page, q.limit, q.resource, q.resourceTypeId)
        } else if (q && q.agreementType === 'funeral') {
            result = await FuneralController.getFuneralDaySheet(q.serviceFromDate, q.serviceToDate, q.locations, true, q.page, q.limit, q.resource, q.resourceTypeId)
        } else {

        }
        customResponse(200, result, res)
    } catch (err) {
        logger.log('error', err)
        customResponse(400, err, res)
    }
}

async function sendEmailDaySheet (req, res) {
    try {
        let result = []
        if (req.query && req.query.agreementType === 'cemetery') {
            result = await Controller.sendEmailDaySheet(req.query, req.currentUser)
        } else if (req.query && req.query.agreementType === 'funeral') {
            result = await FuneralController.sendEmailDaySheet(req.query, req.currentUser)
        }
        customResponse(200, result, res)
    } catch (err) {
        logger.log('error', err)
        customResponse(400, err, res)
    }
}

module.exports = {
    getDaySheets,
    sendEmailDaySheet
}
