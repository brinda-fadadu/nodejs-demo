const router = require('express').Router()
const authentication = require('../../middleware/authentication')
const { getListingValidation } = require('../../lib/validations/wholesaleCremation/wholesaleCremationValidation')
const { requestValidator } = require('../../lib/validations/requestValidator')
const { getListOfWholeSaleCremation,
    createWholeSaleCremation,
    createWholeSaleDecedents,
    editWholeSaleCremation,
    getWholeSaleDetails,
    getWholeSaleItems,
    getCategories,
    createWholeSaleCremationItems,
    editWholeSaleCremationItems } = require('./wholesaleCremation')
const { createOrEditValidation,
    createOrEditItemsBodyValidation,
    createItemsParamValidation,
    editItemsParamValidation,
    categoriesValidation,
    createDecedentValidation,
    editParamValidation } = require('../../lib/validations/miscSales/wholeSaleValidations')
const roleBasedAccess = require('../../middleware/roleAuth')
router.use(authentication)
router.use(roleBasedAccess('Cremation_Scheduling'))
router.get('/categories', requestValidator(categoriesValidation), getCategories)
router.get('/listing', requestValidator(getListingValidation), getListOfWholeSaleCremation)
router.post('/', requestValidator({}, createOrEditValidation), createWholeSaleCremation)
router.post('/decedent', requestValidator({}, createDecedentValidation), createWholeSaleDecedents)
router.put('/:wholeSaleId', requestValidator(editParamValidation, createOrEditValidation), editWholeSaleCremation)
router.get('/:wholeSaleId', getWholeSaleDetails)
router.get('/:wholeSaleId/items', getWholeSaleItems)
router.post('/:wholeSaleId/items', requestValidator(createItemsParamValidation, createOrEditItemsBodyValidation), createWholeSaleCremationItems)
router.put('/:wholeSaleId/items/:wholeSaleItemId', requestValidator(editItemsParamValidation, createOrEditItemsBodyValidation), editWholeSaleCremationItems)

module.exports = router
