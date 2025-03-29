const router = require('express').Router()

// Validator
const validator = require('../../lib/validations/quotation')
const personValidations = require('../../lib/validations/personValidations').personValidation

// request handler
const { listOfQuotations, upsertQuotation, deleteQuotation, getQuotation, shareQuotation, covertToCase, addPerson, previewQuotation, upsertCasePerson } = require('./quotationHandler')
const { createOrEditAgreement, specialFinancing, getAgreementDetails } = require('../person/agreements/agreementHandler')
const { createOrEditAgreementValidation } = require('../../lib/validations/caseInfo/agreements')
const { createAgreementAuth } = require('../../middleware/agreementsAuth')
const { requestValidator } = require('../../lib/validations/requestValidator')
const { quotationsParamsSchema } = require('../../lib/validations/caseInfo/paramsSchema')

router.get('/', validator.validateList, listOfQuotations)
router.get('/:quotationId', getQuotation)
router.put('/', validator.validateCreateOrUpdate, upsertQuotation)
router.delete('/:quotationId', deleteQuotation)
router.post('/share/:quotationId', validator.validateShareQuotation, shareQuotation)
router.post('/preview/:quotationId', validator.validateShareQuotation, previewQuotation)
router.put('/:quotationId/convert-to-case', validator.validateConvertToCase, covertToCase)
router.put('/:quotationId/add-person', personValidations, addPerson)

// agreement without person
router.get('/:quotationId/agreement/:agreementId', requestValidator(quotationsParamsSchema), getAgreementDetails)
router.post('/:quotationId/agreement', createOrEditAgreementValidation, createAgreementAuth, createOrEditAgreement)
router.put('/:quotationId/agreement/:agreementId', createOrEditAgreementValidation, createAgreementAuth, createOrEditAgreement)
router.post('/:quotationId/agreement/:agreementId/special-finance', requestValidator(quotationsParamsSchema), specialFinancing)
// add person in cases
router.put('/case/upsert-person', personValidations, upsertCasePerson)

module.exports = router
