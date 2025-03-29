const router = require('express').Router()
const roleBasedAccess = require('../../middleware/roleAuth')

const { caCheckRequestValidation, addCAVendorValidation, updateStatusValidation, getCAVendorValidation } = require('../../lib/validations/checkRequest/checkRequest')
const authentication = require('../../middleware/authentication')
const { getCAChecksLists, UpdateCACheckRequest, addCAVendor, getCAVendors } = require('./checkRequestHandler')
const { getWorkOrderExceptionReport, getDuplicateWorkOrdersReport, exportDuplicateWorkOrdersReport } = require('./workOrderExceptionReportHandler')
const { getWorkOrderExceptionReportValidation, duplicateWorkOrderValidation } = require('../../lib/validations/workorders')
const { anStatementReportsValidation, exportStatementReportValidation } = require('../../lib/validations/anremainsInfo/anStatementReports')
const { anStatementReports, exportStatementReports } = require('./statementReportsHandler')

router.use(authentication)
router.use(roleBasedAccess('Cash_Advance_Check_Dashboard'))

router.get('/ca-checkRequests', caCheckRequestValidation, getCAChecksLists)
router.post('/ca-check-update-status', updateStatusValidation, UpdateCACheckRequest)
router.post('/ca-add-vendor', addCAVendorValidation, addCAVendor)
router.get('/ca-vendors', getCAVendorValidation, getCAVendors)
router.get('/work-order-exception-report', getWorkOrderExceptionReportValidation, getWorkOrderExceptionReport)
router.get('/duplicate-workorder', duplicateWorkOrderValidation, getDuplicateWorkOrdersReport)
router.get('/duplicate-workorder/export', exportDuplicateWorkOrdersReport)
router.get('/an-statement-reports', anStatementReportsValidation, anStatementReports)
router.get('/an-statement-reports-download', exportStatementReportValidation, exportStatementReports)

module.exports = router
