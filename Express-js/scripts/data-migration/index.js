const router = require('express').Router()
const { migrateAllFinanceScheduleHandler } = require('./1-DM-financeSchedule')
const { migrateAllSchedulePaymentsHandler } = require('./2-DM-schedulePayments')
const { migrateAllAgreementFinanceScheduleHandler } = require('./temp-finance-schedule')
const { migrateAllOrganizationESHandler } = require('./ES-organization.js')
const { migrateAllPersonESHandler } = require('./ES-person.js')
const { migrateAllContractsESHandler } = require('./ES-agreement.js')

// Agreement finance schedule and Agreement finance schedule payment tracking routes.
router.get('/finance-schedule', migrateAllFinanceScheduleHandler)
router.get('/finance-payment', migrateAllSchedulePaymentsHandler)
router.get('/agreement-finance-schedule', migrateAllAgreementFinanceScheduleHandler)
// Elasticsearch run for the UAT
router.get('/elastic-search-organization', migrateAllOrganizationESHandler)
router.get('/elastic-search-person', migrateAllPersonESHandler)
router.get('/elastic-search-agreement', migrateAllContractsESHandler)

module.exports = router
