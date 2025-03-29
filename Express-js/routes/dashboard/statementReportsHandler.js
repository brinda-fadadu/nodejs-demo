const StatementReportsController = require('../../controllers/refactorControllers/statementReportsController/statementReportsController')
const { customResponse } = require('../../lib/custom-response')
const logger = require('../../lib/logger')

async function anStatementReports (req, res) {
    try {
        let result = []
        result = await StatementReportsController.getANReports(req.query)
        customResponse(200, result, res)
    } catch (err) {
        logger.log('error', err)
        customResponse(400, err, res)
    }
}
async function exportStatementReports (req, res) {
    try {
        let result = []
        result = await StatementReportsController.exportStatementReports(req, res)
        customResponse(200, result, res)
    } catch (err) {
        logger.log('error', err)
        customResponse(400, err, res)
    }
}

module.exports = {
    anStatementReports,
    exportStatementReports
}
