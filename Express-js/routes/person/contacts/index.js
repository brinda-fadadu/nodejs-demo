const express = require('express')
const router = express.Router({ mergeParams: true })
const {
    createOrEditContact,
    getContactInfo,
    getContactsList,
    deleteContact
} = require('./contactHandler')
const {
    createOrEditContactValidation
} = require('../../../lib/validations/caseInfo/contacts')
const {
    contactsParamsSchema,
    contactsQuerySchema
} = require('../../../lib/validations/caseInfo/paramsSchema')
const { requestValidator } = require('../../../lib/validations/requestValidator')
const authentication = require('../../../middleware/authentication')
const roleBasedAccess = require('../../../middleware/roleAuth')

router.use(authentication)
router.use(roleBasedAccess('Case_Info'))
router.post('/', createOrEditContactValidation, createOrEditContact)
router.get('/', requestValidator(contactsQuerySchema), getContactsList)
router.get('/:contactId', requestValidator({ ...contactsParamsSchema, ...contactsQuerySchema }), getContactInfo)
router.delete('/:contactId', requestValidator(contactsParamsSchema), deleteContact)
router.put(
    '/:contactId',
    requestValidator(contactsParamsSchema),
    createOrEditContactValidation,
    createOrEditContact
)

module.exports = router
