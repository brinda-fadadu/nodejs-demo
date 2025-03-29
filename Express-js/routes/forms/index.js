const router = require('express').Router()
const authentication = require('../../middleware/authentication')
const { requestValidator } = require('../../lib/validations/requestValidator')
const {
    getListOfCaseInfoFormsRequestParamsSchema,
    sendCaseInfoFormsRequestBodySchema,
    sendCaseInfoFormsRequestParamsSchema,
    previewCaseInfoFormRequestParamsSchema,
    previewCaseInfoFormRequestBodySchema,
    voidCaseInfoFormRequestParamsSchema,
    deleteCaseInfoFormsRequestParamsSchema,
    downloadCaseInfoFormRequestParamsSchema,
    embeddedSigningCaseInfoFormRequestBodySchema,
    sendCaseInfoFormsRecipientRequestParamsSchema,
    changeRoutingOrderEnvelopeRequestBodySchema,
    envelopeIdRequestParamsSchema,
    validateEmailSchema,
    sendCaseInfoFormsRequestBodyNewSchema,
    mergeRecipientsRequestBodySchema
} = require('../../lib/validations/validationSchemas')
const {
    getListOfForms,
    getListOfCaseInfoForms,
    sendCaseInfoForms,
    previewCaseInfoForm,
    deleteCaseInfoForms,
    voidCaseInfoForm,
    downloadCaseInfoForm,
    checkLatestStatusOfForm,
    getInPersonHosts,
    embeddedSignForCaseInfoForm,
    getNextRecipientViewForsigning,
    getDocusingBrands,
    generateRecipientUrlAndSendEmail,
    createEnvelope,
    previewEnvelope,
    confirmEnvelope,
    validateEmailAddress,
    changeRoutingOrderOfRecipientsInAnEnvelope,
    getMergeRecipients
} = require('./formsHandler')
const roleBasedAccess = require('../../middleware/roleAuth')

const docusignCallback = require('./docusignCallback')

router.post('/docusign/callback', docusignCallback)

router.use(authentication)

router.put('/person/:personId/deleteForms', roleBasedAccess('Case_Info', 'DELETE'),
    requestValidator(deleteCaseInfoFormsRequestParamsSchema),
    deleteCaseInfoForms)

router.use(roleBasedAccess('Case_Info'))

router.get('/', getListOfForms)

router.get('/person/:personId/list',
    requestValidator(getListOfCaseInfoFormsRequestParamsSchema),
    getListOfCaseInfoForms)

/* router.post('/person/:personId/send',
    requestValidator(sendCaseInfoFormsRequestParamsSchema, sendCaseInfoFormsRequestBodySchema),
    sendCaseInfoForms) */

router.post('/:formId/person/:personId/preview',
    requestValidator(previewCaseInfoFormRequestParamsSchema, previewCaseInfoFormRequestBodySchema),
    previewCaseInfoForm)

router.put('/:caseInfoFormId/person/:personId/voidForm',
    requestValidator(voidCaseInfoFormRequestParamsSchema),
    voidCaseInfoForm)

router.get('/:envelopeId/person/:personId/downloadForm',
    requestValidator(downloadCaseInfoFormRequestParamsSchema),
    downloadCaseInfoForm)

router.get('/:envelopeId/person/:personId/latestStatusOfForm',
    requestValidator(downloadCaseInfoFormRequestParamsSchema),
    checkLatestStatusOfForm)

router.get('/inPersonHosts', getInPersonHosts)

router.get('/:envelopeId/person/:personId/getRecipientView', requestValidator(downloadCaseInfoFormRequestParamsSchema), getNextRecipientViewForsigning)
router.get('/docusign-brands', getDocusingBrands)

router.post('/person/:personId/confirm',
    requestValidator(sendCaseInfoFormsRequestParamsSchema, sendCaseInfoFormsRequestBodySchema),
    sendCaseInfoForms)

router.get('/person/:personId/recipient/:recipientId/sendForm',
    requestValidator(sendCaseInfoFormsRecipientRequestParamsSchema),
    generateRecipientUrlAndSendEmail)

router.post('/:formId/person/:personId/embeddedView',
    requestValidator(previewCaseInfoFormRequestParamsSchema, embeddedSigningCaseInfoFormRequestBodySchema),
    embeddedSignForCaseInfoForm)

router.post('/person/:personId/createDraftEnvelope',
    requestValidator(sendCaseInfoFormsRequestParamsSchema, sendCaseInfoFormsRequestBodyNewSchema),
    createEnvelope)

router.post('/envelope/:envelopeId/changeRoutingOrder',
    requestValidator(envelopeIdRequestParamsSchema, changeRoutingOrderEnvelopeRequestBodySchema),
    changeRoutingOrderOfRecipientsInAnEnvelope)

router.get('/envelope/:envelopeId/preview',
    requestValidator(envelopeIdRequestParamsSchema),
    previewEnvelope)

router.put('/envelope/:envelopeId/confirmAndSendEnvelope',
    requestValidator(envelopeIdRequestParamsSchema),
    confirmEnvelope)

router.post('/envelope/mergeRecipients',
    requestValidator(null, mergeRecipientsRequestBodySchema),
    getMergeRecipients)

router.post('/validate-email',
    requestValidator(null, validateEmailSchema),
    validateEmailAddress)
/**
 * 7 Routes and all belong to a Person except 1
 * DB analysis and Changes if any
 * Understand Docusign
 * Form Validator Module
 * No Request Validator, We will have to implement that
 * Don't use transaction, as this is creating an issue at the moment
 * Models Involved:
 * FormCategory,
 * Form,
 * FormRecipientRole,
 * FormRecipientContactRole,
 * CaseInfoFormRecipient,
 * ContactPerson,
 * Person,
 * Employee,
 * OtherRecipient
 * Certifier
 * PropertyOwner
 * AgreementPerson
 * Router: Index.js, formActions.js (DeleteForm, listForms, voidForm, previewForm, downloadForm, sendForms), docusignCallback.js
 * Validations: API request validations
*/

module.exports = router
