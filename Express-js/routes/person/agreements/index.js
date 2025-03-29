const express = require('express')
const router = express.Router({ mergeParams: true })
const authentication = require('../../../middleware/authentication')
const { createOrEditAgreementValidation } = require('../../../lib/validations/caseInfo/agreements')
const {
    createOrEditAgreement,
    getAgreementsOfPerson,
    getAgreementDetails,
    getSaleTypes,
    checkoutAgreement,
    finaliseFinanceOptions,
    refinancing,
    getFinanceDetails,
    specialFinancing,
    revokeFinancing,
    getNewPrincipalRefinance,
    downloadUnequalSchedule,
    voidAgreementHandler
} = require('./agreementHandler')
const { finalizingFinanceValidation } = require('../../../lib/validations/financeOption')
const {
    agreementsParamsSchema,
    agreementsQuerySchema,
    addendumQuerySchema
} = require('../../../lib/validations/caseInfo/paramsSchema')
const { requestValidator } = require('../../../lib/validations/requestValidator')
const roleBasedAccess = require('../../../middleware/roleAuth')
const { agreementsAuth, createAgreementAuth } = require('../../../middleware/agreementsAuth')

router.use(authentication)
router.get('/', requestValidator(agreementsQuerySchema), getAgreementsOfPerson)
router.post('/', createOrEditAgreementValidation, createAgreementAuth, roleBasedAccess(), createOrEditAgreement)
router.get('/saleTypes', getSaleTypes)
router.delete('/:agreementId/revoke', requestValidator(agreementsParamsSchema), agreementsAuth, roleBasedAccess(null, 'write'), revokeFinancing)

const agreementRouter = express.Router({ mergeParams: true })
agreementRouter.get('/', requestValidator({ ...agreementsParamsSchema, ...agreementsQuerySchema }), getAgreementDetails)
agreementRouter.put('/', requestValidator(agreementsParamsSchema), createOrEditAgreementValidation, createOrEditAgreement)
agreementRouter.put('/checkout', requestValidator(agreementsParamsSchema), checkoutAgreement)
agreementRouter.post('/finance-options/finalize', requestValidator(agreementsParamsSchema), finalizingFinanceValidation, finaliseFinanceOptions)
agreementRouter.get('/finance', requestValidator(agreementsParamsSchema), getFinanceDetails)
agreementRouter.get('/new-principal', requestValidator({ ...agreementsParamsSchema, ...addendumQuerySchema }), getNewPrincipalRefinance)
agreementRouter.get('/download-unequal-schedule', requestValidator(agreementsParamsSchema), downloadUnequalSchedule)
agreementRouter.put('/re-finance', requestValidator(agreementsParamsSchema), refinancing)
agreementRouter.post('/special-finance', requestValidator(agreementsParamsSchema), specialFinancing)
agreementRouter.put('/void', voidAgreementHandler)
router.use('/:agreementId', agreementsAuth, roleBasedAccess(), agreementRouter)
module.exports = router
