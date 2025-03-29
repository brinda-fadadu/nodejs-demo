const express = require('express')
const router = express.Router()
const authentication = require('../../middleware/authentication')
const roleBasedAccess = require('../../middleware/roleAuth')
const { requestValidator } = require('../../lib/validations/requestValidator')
const { getCategoryRequestSchema,
    getItemsRequestSchema,
    getCategoryAttributesRequestSchema,
    getMemorialCategoriesRequestSchema,
    // getMonumentItemsRequestSchema,
    getMonumentExceptionItemsRequestSchema,
    getMemorialItemsRequestSchema,
    uploadItemImagesBodyParamsSchema,
    uploadItemImagesQueryParamsSchema,
    getMemorialPropertyParamsSchema,
    cashAdvanceItemsParamsSchema
} = require('../../lib/validations/validationSchemas')
const { itemListValidation, itemCategoriesListValidation } = require('../../lib/validations/itemImages/itemImages')
const itemCategoriesHandler = require('./itemCategory')
const { getItemsListByFilters, getItemsListForImageUpload } = require('./item')
const itemImagesHandler = require('./itemImages')
const multer = require('multer')

const upload = multer({ dest: 'uploads/' })

router.use(authentication)

// Get Items
router.get('/', requestValidator(getItemsRequestSchema), getItemsListByFilters) // Expected query params: itemTypeId, locationId, itemIndustryId, itemCategoryId
router.get('/categories', requestValidator(getCategoryRequestSchema), itemCategoriesHandler.getItemCategories) // Expected query params: itemTypeId, itemIndustryId
router.get('/categories/attributes', requestValidator(getCategoryAttributesRequestSchema), itemCategoriesHandler.getItemCategoryAttributes) // Expected query params: ItemCategoryId
router.get('/categories/memorial', requestValidator(getMemorialCategoriesRequestSchema), itemCategoriesHandler.getMemorialCategories) // Expected query params: agreementId
router.get('/monument', requestValidator(getMonumentExceptionItemsRequestSchema), itemCategoriesHandler.getMonumentItems) // Expected query params: memorialTypeId, memorialSizeIds, agreementId
router.get('/monument-exceptions', requestValidator(getMonumentExceptionItemsRequestSchema), itemCategoriesHandler.getMonumentExceptionItems) // Expected query params: memorialTypeId, agreementId, propertyIds, isSideBySide
router.get('/memorial', requestValidator(getMemorialItemsRequestSchema), itemCategoriesHandler.getMemorialItems) // Expected query params: monumentItemId, agreementId
router.get('/memorial-properties', requestValidator(getMemorialPropertyParamsSchema), itemCategoriesHandler.getMemorialProperties) // Expected query params: agreementId
// Get Cash Advance Items Price
router.get('/cashAdvanceItemsPrice/:itemId', requestValidator(cashAdvanceItemsParamsSchema), itemCategoriesHandler.getCashAdvanceItemsPrice) // Expected query params: itemId
router.use(roleBasedAccess('Admin'))

router.get('/forImageUpload/', requestValidator(itemListValidation()), getItemsListForImageUpload)
router.get('/forImageUpload/categories', requestValidator(itemCategoriesListValidation), itemCategoriesHandler.getItemCategories)
router.get('/forImageUpload/categories/attributes', requestValidator(getCategoryAttributesRequestSchema), itemCategoriesHandler.getItemCategoryAttributes)
router.post('/images', upload.any('files[]', 3), requestValidator(null, uploadItemImagesBodyParamsSchema), itemImagesHandler.uploadImages)
router.delete('/images/:imageId', requestValidator(uploadItemImagesQueryParamsSchema), itemImagesHandler.deleteImages)
router.put('/images/:imageId/makePrimary', requestValidator(uploadItemImagesQueryParamsSchema), itemImagesHandler.makePrimary)

module.exports = router
