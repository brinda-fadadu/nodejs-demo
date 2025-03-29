const { customResponse } = require('../../lib/custom-response')
const logger = require('../../lib/logger')
const OnePageDaySheetFuneralController = require('../../controllers/refactorControllers/onePageDaySheet/onePageDaySheetForFuneral')

async function getOnePageDaySheets (req, res) {
    try {
        let q = req.query
        const result = await OnePageDaySheetFuneralController.getFuneralOnePageDaySheet(q.serviceFromDate, q.serviceToDate, true, q.page, q.limit, q.locations)
        customResponse(200, result, res)
    } catch (err) {
        logger.log('error', err)
        customResponse(400, err, res)
    }
}

async function sendEmailOnePageDaySheet (req, res) {
    try {
        const result = await OnePageDaySheetFuneralController.sendEmailOnePageDaySheet(req.query, req.currentUser)
        customResponse(200, result, res)
    } catch (err) {
        logger.log('error', err)
        customResponse(400, err, res)
    }
}

module.exports = {
    getOnePageDaySheets,
    sendEmailOnePageDaySheet
}
