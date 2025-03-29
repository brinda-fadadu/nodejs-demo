const router = require('express').Router()

const authentication = require('../../middleware/authentication')
const { getOnePageDaySheets, sendEmailOnePageDaySheet } = require('./onePageDaySheet')

// Validator
const { onePageDaySheetValidation, sendOnePageDaySheetEmailValidation } = require('./../../lib/validations/onePageDaySheet/onePageDaySheet')

// Route
router.use(authentication)
router.get('/', onePageDaySheetValidation, getOnePageDaySheets)
router.get('/email', sendOnePageDaySheetEmailValidation, sendEmailOnePageDaySheet)

module.exports = router
