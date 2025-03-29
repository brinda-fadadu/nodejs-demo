const express = require('express')
const router = express.Router({ mergeParams: true })
const authentication = require('../../../middleware/authentication')

// Validations
const { personIdValidation } = require('../../../lib/validations/personIdValidation')
const { itemUsageQueryValidation, itemUsageUpdateValidation, itemUsageConfirmValidation, itemUsageReviewSelectionValidation } = require('../../../lib/validations/itemUsage/itemUsage')

// Handlers
const { getItemUsageSummary, getAvailableItemsForItemUsage, createAndUpdateItemUsage, updateItemUsageConfirm, getSelectedMerchandiseItems } = require('../../itemUsage/itemUsage')

const roleBasedAccess = require('../../../middleware/roleAuth')

router.use(authentication)

router.use(roleBasedAccess('Service_Scheduling'))
router.get('/summary', personIdValidation, getItemUsageSummary)
router.get('/items', personIdValidation, itemUsageQueryValidation, getAvailableItemsForItemUsage)
router.put('/', itemUsageUpdateValidation, createAndUpdateItemUsage)
router.put('/confirm', itemUsageConfirmValidation, updateItemUsageConfirm)
router.get('/selected-merchandise-list', itemUsageReviewSelectionValidation, personIdValidation, getSelectedMerchandiseItems)

module.exports = router
