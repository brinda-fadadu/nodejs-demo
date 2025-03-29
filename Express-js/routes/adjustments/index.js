const router = require('express').Router()

// authentication and autherization handlers
const authentication = require('../../middleware/authentication')
const roleBasedAccess = require('../../middleware/roleAuth')

// api handlers
const {
    createAdjustment,
    updateAdjustment,
    getAdjustment,
    getAdjustments,
    deleteAdjustment
} = require('../adjustments/adjustments')

// validation handlers
const {
    createPromoCodeValidator,
    validateParams,
    validateQueryParams,
    updatePromoCodeValidator
} = require('../../lib/validations/adjustments/adjustments')

router.use(authentication)

// getAdjustments API is calling in 2 places with different query params, that's why it is out side of role scope
router.get('/', validateQueryParams, getAdjustments)

router.use(roleBasedAccess('Admin'))

router.post('/', createPromoCodeValidator, createAdjustment)
router.get('/:adjustmentId', validateParams, getAdjustment)
router.put(
    '/:adjustmentId',
    validateParams,
    updatePromoCodeValidator,
    updateAdjustment
)
router.delete('/:adjustmentId', validateParams, deleteAdjustment)

module.exports = router
