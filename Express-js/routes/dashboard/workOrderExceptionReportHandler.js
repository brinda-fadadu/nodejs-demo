const WorkOrderExceptionReportController = require('../../controllers/refactorControllers/exceptionReportsController/workOrderExceptionReportsController')
const { customResponse } = require('../../lib/custom-response')
const logger = require('../../lib/logger')
const Json2csvParser = require('json2csv').Parser
const _ = require('lodash')
async function getWorkOrderExceptionReport (req, res) {
    try {
        let result = []
        result = await WorkOrderExceptionReportController.getWOExceptionReportLists(req.query)
        customResponse(200, result, res)
    } catch (err) {
        logger.log('error', err)
        customResponse(400, err, res)
    }
}
async function getDuplicateWorkOrdersReport (req, res, next) {
    try {
        const result = await WorkOrderExceptionReportController.getDuplicateWorkOrderReport(req.query)
        customResponse(200, result, res)
    } catch (err) {
        customResponse(400, err, res)
    }
}
async function exportDuplicateWorkOrdersReport (req, res, next) {
    try {
        let data = await WorkOrderExceptionReportController.getDuplicateWorkOrderReport(req.query, true)
        if (data.length) {
            let exportRes = data.map((e, key) => {
                return {
                    'Contract #': _.get(e, 'contract.contractNumber', null),
                    'Decedent (OPI)': _.get(e, 'decedentOnePortalId'),
                    'Arranger': _.get(e, 'arranger.name'),
                    'Work Order (WO ID)': _.get(e, 'workOrderId'),
                    'Created On': _.get(e, 'createdOn'),
                    'Duplicate Work Order (WO ID)': e.duplicateWorkOrders.map(duplicate => duplicate.workOrderId).join(','),
                    'CREATED ON': e.duplicateWorkOrders.map(duplicate => duplicate.createdOn).join(',')
                }
            })
            const json2csvParser = new Json2csvParser({ excelStrings: true })
            const csv = json2csvParser.parse(exportRes)
            res.attachment('duplicateWorkOrder.csv')
            res.send(Buffer.from(csv))
        } else {
            res.json({
                success: true,
                msg: 'No records found'
            })
        }
    } catch (error) {
        logger.error(error)
        next(error)
    }
}

module.exports = {
    getWorkOrderExceptionReport,
    getDuplicateWorkOrdersReport,
    exportDuplicateWorkOrdersReport
}
