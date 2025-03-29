const express = require('express')
const router = express.Router({ mergeParams: true })
const authentication = require('../../middleware/authentication')
const { createOrEditAgreementItems, listAgreementItems, addPayors, getPayors, deletePayor, markAgreementComplete, updatePayor, downloadFuneralAgreementInvoice } = require('./agreementItems')
const { manageReservations, getProperties, updateAdditionalRights, listingAdditionalRights, extensionRequest,
    createSideBySideProperty, updateSideBySideProperty, deleteSideBySideProperty, listSideBySideProperties, removeUnusedItems, getOwnersOfProperties, addAgreementPropertyOwner, deleteAgreementPropertyOwner, downloadCertificateOfSepulcher } = require('./agreementProperties')

const { getListOfAgreementAdjustments, applyAdjustmentAsAgreementAdjustment, removeAgreementAdjustment } = require('../adjustments/adjustments')
const { createORupdateCashAdvanceItem, getCashAdvanceItem, removeCashAdvanceItem, cashAdvanceItemsChequeRequest } = require('./agreementCashAdvancedItems')

const { createOrUpdateAgreementMemorial, deleteAgreementMemorial, editMemorialItemQuantity, listAgreementMemorials } = require('./agreementMemorialItems')
const addendumHandler = require('../addendum')

// validation handlers
const { validateIdInParams, validateApplyAdjustment, validateRemoveAdjustment } = require('../../lib/validations/adjustments/adjustments')
const { validatecreateCAI, validateRemoveCAI, validateCashAdvanceItemsChequeRequest } = require('../../lib/validations/agreementItems/cashAdvanceItems')
const { validateCreateMemorial, validateDeleteMemorial, validateMemorialItem, validateGetMemorials } = require('../../lib/validations/agreementItems/memorialItems')
const { validateManageProperties, validateAdditionalRights, validateSideBySideProperty, validateExtensionRequest, addOwnersToPropertiesValidation, deletePropertyOwnerValidation, propertyOwnerValidation } = require('../../lib/validations/agreementItems/manageProperties')
const { addOrRemovePackage, listAgreementPackageItems } = require('./agreementPackages')
const { validateAgreementItems } = require('../../lib/validations/agreementItems/agreementItems')
const { addSpecialOrderRequest,
    getSpecialOrderRequests,
    updateSpecialOrderRequests,
    removeSpecialOrderRequest,
    getSepcialOrderRequestById,
    sendValidationEmail,
    approveSpecialOrderRequests } = require('./agreementSpecialOrderRequests')
const { postMethodValidation, getAndRemoveMethodValidation, updateMethodValidation, listMethodValidation } = require('../../lib/validations/specialOrderRequests')
const {
    fetchRoles
} = require('../person/agreements/agreementHandler')
const roleBasedAccess = require('../../middleware/roleAuth')
const { agreementsAuth } = require('../../middleware/agreementsAuth')
const { memorialsAuth } = require('../../middleware/memorialsAuth')
const multer = require('multer')

const upload = multer({ dest: 'uploads/' })

router.use(authentication)
router.delete('/:agreementId/payors/:payorId', agreementsAuth, roleBasedAccess(null, 'write'), deletePayor)
router.delete('/:agreementId/agreement-cash-advanced-items/:agreementCashAdvancedItemId', validateRemoveCAI, agreementsAuth, roleBasedAccess(null, 'write'), removeCashAdvanceItem)
router.delete('/:agreementId/special-order-requests/:specialOrderRequestId', getAndRemoveMethodValidation, agreementsAuth, roleBasedAccess(null, 'write'), removeSpecialOrderRequest)
router.delete('/:agreementId/memorial/:memorialId', validateDeleteMemorial, agreementsAuth, memorialsAuth, roleBasedAccess(), deleteAgreementMemorial)
router.delete('/:agreementId/adjustments/:agreementAdjustmentId', agreementsAuth, roleBasedAccess(null, 'write'), validateRemoveAdjustment, removeAgreementAdjustment)

router.get('/roles', fetchRoles)
const agreementRouter = express.Router({ mergeParams: true })
agreementRouter.put('/item/:action', validateAgreementItems, createOrEditAgreementItems)
agreementRouter.get('/', listAgreementItems)
agreementRouter.delete('/remove-all-items', removeUnusedItems)
agreementRouter.post('/payors', addPayors)
agreementRouter.post('/payors/:payorId', agreementsAuth, roleBasedAccess(null, 'write'), updatePayor)
agreementRouter.get('/payors', getPayors)
agreementRouter.post('/properties', validateManageProperties, manageReservations)
agreementRouter.get('/properties', getProperties)
agreementRouter.put('/properties/:agreementPropertyId/extension-request', validateExtensionRequest, extensionRequest)
agreementRouter.put('/properties/:agreementPropertyId/additional-rights/:action', validateAdditionalRights, updateAdditionalRights)
agreementRouter.get('/properties/:agreementPropertyId/additional-rights', listingAdditionalRights)
agreementRouter.get('/property-owners', getOwnersOfProperties)
agreementRouter.post('/property/:propertyId/owner', addOwnersToPropertiesValidation, propertyOwnerValidation, addAgreementPropertyOwner)
agreementRouter.delete('/property/:propertyId/owner/:ownerId', deletePropertyOwnerValidation, propertyOwnerValidation, deleteAgreementPropertyOwner)
agreementRouter.get('/download', downloadFuneralAgreementInvoice)
agreementRouter.get('/downloadCertificateOfSepulcher', downloadCertificateOfSepulcher)

// API routes for Side-by-side Property
agreementRouter.post('/side-by-side', validateSideBySideProperty, createSideBySideProperty)
agreementRouter.put('/side-by-side/:sideBySidePropertyId', validateSideBySideProperty, updateSideBySideProperty)
agreementRouter.delete('/side-by-side/:sideBySidePropertyId', validateSideBySideProperty, deleteSideBySideProperty)
agreementRouter.get('/side-by-side', listSideBySideProperties)

// API routes for cash advance items
agreementRouter.put('/agreement-cash-advanced-items', validatecreateCAI, createORupdateCashAdvanceItem)
agreementRouter.get('/agreement-cash-advanced-items/:agreementCashAdvancedItemId', getCashAdvanceItem)
agreementRouter.post('/agreement-cash-advanced-items/generateChequeRequest', validateCashAdvanceItemsChequeRequest, roleBasedAccess('Cash_Advance_Check_Requests'), cashAdvanceItemsChequeRequest)

// API routes for apply, remove, list adjustments for agreement
agreementRouter.get('/adjustments/listOfAgreementAdjustments', validateIdInParams, getListOfAgreementAdjustments)
agreementRouter.post('/adjustments', validateIdInParams, validateApplyAdjustment, applyAdjustmentAsAgreementAdjustment)

// API routes for Add, Remove packages and listing out items available in the added package.
agreementRouter.put('/package/:action', addOrRemovePackage)
agreementRouter.get('/packages/:agreementPackageId/items', listAgreementPackageItems)

// API routes for special order requests add, list, edit and remove
agreementRouter.post('/special-order-requests', postMethodValidation, addSpecialOrderRequest)
agreementRouter.get('/special-order-requests', listMethodValidation, getSpecialOrderRequests)
agreementRouter.get('/special-order-requests/:specialOrderRequestId', getAndRemoveMethodValidation, getSepcialOrderRequestById)
agreementRouter.put('/special-order-requests/:specialOrderRequestId', updateMethodValidation, updateSpecialOrderRequests)
agreementRouter.put('/special-order-requests/:specialOrderRequestId/sendValidation', sendValidationEmail)
agreementRouter.post('/special-order-requests/:specialOrderRequestId/approve', roleBasedAccess('Special_Order_Quote'), upload.single('file'), approveSpecialOrderRequests)

// API routes for add, remove memorials and listing/ editing the quantity of selected memorial items
agreementRouter.put('/memorial/:action', validateCreateMemorial, memorialsAuth, roleBasedAccess(), createOrUpdateAgreementMemorial)
agreementRouter.get('/memorial', validateGetMemorials, listAgreementMemorials)
agreementRouter.put('/memorial/:memorialId/items/:itemId', validateMemorialItem, memorialsAuth, roleBasedAccess(), editMemorialItemQuantity)

// addendum routes
agreementRouter.use('/addendum', addendumHandler)

// api to mark agreement complete (to be removed later)
agreementRouter.put('/complete', markAgreementComplete)

router.use('/:agreementId', agreementsAuth, roleBasedAccess(), agreementRouter)

module.exports = router
