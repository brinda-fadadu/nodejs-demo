const router = require('express').Router()
const authentication = require('../../middleware/authentication')
const getServices = require('./getServices')
const getPackages = require('./getPackages')
const getMerchandise = require('./getMerchandise')
const getCashAdvanceItems = require('./getCashAdvanceItems')
const paginationCheck = require('../../lib/paginationCheckMiddleware')

router.use(authentication)
router.get('/packages', getPackages)
router.use(paginationCheck)
router.get('/services', getServices)
router.get('/merchandise', getMerchandise)
router.get('/cash-advance-items', getCashAdvanceItems)

module.exports = router
