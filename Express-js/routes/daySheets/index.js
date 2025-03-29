const router = require('express').Router()

const authentication = require('../../middleware/authentication')
const { getDaySheets, sendEmailDaySheet } = require('./daySheet')

// Validator
const { daySheetValidation, sendDaySheetEmailValidation } = require('./../../lib/validations/daySheets/daySheet')

// Route
router.use(authentication)
router.get('/', daySheetValidation, getDaySheets)
router.get('/email', sendDaySheetEmailValidation, sendEmailDaySheet)

module.exports = router
