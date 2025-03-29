const router = require('express').Router()
const authentication = require('../../middleware/authentication')

// TODO: in persons related functionalities, write one common function to add/ edit person or person address and use those functions here
// TODO: write seperate api's for person primayDetails api's
// TODO: write seperate api's for person overview
// TODO: use the person create method for creating contact also

// handlers
const createPerson = require('./createPerson')
const searchPerson = require('./personSearch')
const getNotesHandler = require('./notes')
const anRemainsHandler = require('./anRemains')
const agreementHandler = require('./agreements')
const schedulingHandler = require('./scheduling')
const itemUsageHandler = require('./itemUsage.js')

const personUpdateHandler = require('./personUpdate')

const { simpleSearchHandler, personSearchByOpiHandler } = require('./simpleSearch')
const advanceSearchHandler = require('./advanceSearch')
const { getArrangement,
    createArrangement } = require('./arrangement')

const additionalInfo = require('./additionalInfo')
const { createObituary, createObituaryFile, getObituaryDetails, uploadPersonPicture, downloadObituaryPDF } = require('./obituary')

const personUpdateValidation = require('../../lib/validations/updatePersonValidations')
    .personUpdateValidation

const simpleSearchValidations = require('../../lib/validations/searchValidations/simpleSearchValidations')
const advanceSearchValidations = require('../../lib/validations/searchValidations/advanceSearchValidations')
// const searchNotifierValidation = require('../../lib/validations/caseInfo/searchNotifier')
const { updatePrimaryDetails, getPrimaryDetails } = require('./personOverview/primaryDetails')
const { pnTurnAn, fetchSSNDetails } = require('./pnTurnAn')
const personValidations = require('../../lib/validations/personValidations').personValidation
const { personIdValidation } = require('../../lib/validations/personIdValidation')
const { agreementItemsValidation } = require('../../lib/validations/scheduling/scheduling')
const { listOfTransfers, exportDecdents, openCasesList, exportOpenCaseReport, temporialBurialReport, exportTemporialBurialReport } = require('./decedentTracking')
const openCasesListValidations = require('../../lib/validations/openCasesValidations')

const {
    getNokDetails,
    updateNokDetails,
    getNotifierDetails,
    updateNotifierDetails,
    getParentsDetails,
    updateParentsDetails,
    getNoks,
    searchNotifiers
} = require('./personOverview/contactsOnOverview')
const { getCertifierDetails, updateCertifierDetails, searchCertifier, duplicateCertifierReport, exportDuplicateCertifierReport, duplicateOrganization, exportDuplicateOrganization } = require('./personOverview/certifierDetails')
const { getDeathInfoDetails, updateDeathInfoDetails } = require('./personOverview/deathDetails')
const { getEducationDetails, updateEducationDetails } = require('./personOverview/educationDetails')
const { getEthnicityDetails, updateEthnicityDetails } = require('./personOverview/ethnicityDetails')
const { getVeteranDetails, updateVeteranDetails } = require('./personOverview/veteranDetails')
const {
    primaryDetails,
    residentialDetails,
    ethnicityDetails,
    educationDetails,
    veteranDetails,
    deathDetails,
    certifierDetails,
    parentsValidation,
    contactsValidation,
    fetchFullSSNValidation
} = require('../../lib/validations/caseInfo/personOverview')
const { createObituaryValidation, createObituaryFileValidation, uploadPersonPictureValidation } = require('../../lib/validations/obituary')
const contactsHandler = require('./contacts')
const { getPersonDetails } = require('./verifiedPersonDetails')
const { personIdSchema, certifierParamsSchema, deathDetailsParamsSchema, nokParamsSchema, notifierParamsSchema, ethnicityParamsSchema, educationParamsSchema, parentsParamsSchema, veteranParamsSchema, obituaryPdfSchema } = require('../../lib/validations/caseInfo/paramsSchema')
const { requestValidator } = require('../../lib/validations/requestValidator')
const { getAgreementItems } = require('../scheduling/scheduling')
const roleBasedAccess = require('../../middleware/roleAuth')
const { cemeterySchedulingAuth } = require('../../middleware/cemeterySchedulingAuth')
const validateDecedentTracking = require('../../lib/validations/decedentValidations')
const { temporialBurialReportValidation, certifierReportValidation, organizationReportValidation } = require('../../lib/validations/temporialBurialReportValidation')

router.use(authentication)
router.use('/:personId/contacts', contactsHandler)
router.use('/:personId/agreement', agreementHandler)
router.use('/:personId/anRemains', anRemainsHandler)
router.use('/:personId/scheduling', schedulingHandler)
router.use('/:personId/item-usage', itemUsageHandler)

router.get('/:personId/agreement-items', cemeterySchedulingAuth, roleBasedAccess(), personIdValidation, agreementItemsValidation, getAgreementItems)
router.post('/search/advanced', roleBasedAccess('Case_Info', 'read'), advanceSearchValidations, advanceSearchHandler)

router.use(roleBasedAccess('Case_Info'))
router.post('/', personValidations, createPerson)
router.get('/', getPersonDetails)
router.post('/search', searchPerson)

router.get('/:personId/notes', requestValidator(personIdSchema), getNotesHandler)

router.get('/:personId/additional-info', additionalInfo)

router.put('/:personId/update', requestValidator(personIdSchema), personUpdateValidation, personUpdateHandler)
router.get('/search/simple', simpleSearchValidations, simpleSearchHandler)
router.get('/search/certifier', searchCertifier)
router.get('/search/notifier', searchNotifiers)
router.get('/search/person-es-by-opi', personSearchByOpiHandler)

/**
 * Case info related APIs
 */
router.get('/:personId/primary-details', requestValidator(personIdSchema), getPrimaryDetails)
router.put('/:personId/primary-details', requestValidator(personIdSchema), primaryDetails, updatePrimaryDetails)

router.get('/:personId/residential-details', requestValidator(personIdSchema), getPrimaryDetails)
router.put('/:personId/residential-details', requestValidator(personIdSchema), residentialDetails, updatePrimaryDetails)

router.get('/:personId/death-details', requestValidator(personIdSchema), getDeathInfoDetails)
router.post('/:personId/death-details', requestValidator(personIdSchema), deathDetails, updateDeathInfoDetails)
router.put('/:personId/death-details/:deathDetailsId', requestValidator(deathDetailsParamsSchema), deathDetails, updateDeathInfoDetails)

router.get('/:personId/certifier', getCertifierDetails)
router.post('/:personId/certifier', certifierDetails, updateCertifierDetails)
router.put('/:personId/certifier/:certifierId', requestValidator(certifierParamsSchema), certifierDetails, updateCertifierDetails)

router.get('/:personId/veteran-info', getVeteranDetails)
router.post('/:personId/veteran-info', veteranDetails, updateVeteranDetails)
router.put('/:personId/veteran-info/:veteranId', requestValidator(veteranParamsSchema), veteranDetails, updateVeteranDetails)

router.get('/:personId/ethnicity', getEthnicityDetails)
router.post('/:personId/ethnicity', ethnicityDetails, updateEthnicityDetails)
router.put('/:personId/ethnicity/:ethnicityId', requestValidator(ethnicityParamsSchema), ethnicityDetails, updateEthnicityDetails)

router.get('/:personId/education', getEducationDetails)
router.post('/:personId/education', educationDetails, updateEducationDetails)
router.put('/:personId/education/:educationId', requestValidator(educationParamsSchema), educationDetails, updateEducationDetails)

router.get('/:personId/nok', getNoks)
router.post('/:personId/nok', contactsValidation, updateNokDetails)
router.put('/:personId/nok/:nokId', requestValidator(nokParamsSchema), contactsValidation, updateNokDetails)
router.get('/:personId/nok/:nokId', requestValidator(nokParamsSchema), getNokDetails)

router.get('/:personId/notifier', getNotifierDetails)
router.post('/:personId/notifier', contactsValidation, updateNotifierDetails)
router.put('/:personId/notifier/:notifierId', requestValidator(notifierParamsSchema), contactsValidation, updateNotifierDetails)

router.get('/:personId/parents', getParentsDetails)
router.post('/:personId/parents', parentsValidation, updateParentsDetails)
router.put('/:personId/parents/:parentId', requestValidator(parentsParamsSchema), parentsValidation, updateParentsDetails)

// statements related APIs

router.get('/:personId/arrangement', getArrangement)
router.post('/:personId/arrangement', createArrangement)

// Search API for Notifier
// router.get('/notifier-info/search', searchNotifierValidation, notifier.searchNotifierHandler)

// Obituary APIs
router.get('/:personId/obituary', getObituaryDetails)
router.get('/:personId/obituaryPDFDownload', requestValidator(obituaryPdfSchema), downloadObituaryPDF)
router.post('/:personId/obituary', createObituaryValidation, createObituary)
router.post('/:personId/obituary/file', createObituaryFileValidation, createObituaryFile)
router.post('/:personId/picture', uploadPersonPictureValidation, uploadPersonPicture)

// pn-turn-an API
router.put('/:personId/pn-turn-an', personIdValidation, pnTurnAn)
router.put('/fetchSSNDetails', fetchFullSSNValidation, fetchSSNDetails)

// Decedent Tracking Details
router.get('/decedent-tracking', validateDecedentTracking, listOfTransfers)
router.get('/decedent-tracking/export', exportDecdents)

// Open case report
router.get('/open-case-report', openCasesListValidations, openCasesList)
router.get('/open-case-report/export', exportOpenCaseReport)

// Temporial Burial report
router.get('/temporial-burial-report', temporialBurialReportValidation, temporialBurialReport)
router.get('/temporial-burial-report/export', exportTemporialBurialReport)
module.exports = router

// Duplicate certifier report
router.get('/duplicate-certifier-report', certifierReportValidation, duplicateCertifierReport)
router.get('/duplicate-certifier-report/export', exportDuplicateCertifierReport)

// Duplicate Organization report
router.get('/duplicate-organization-report', organizationReportValidation, duplicateOrganization)
router.get('/duplicate-organization-report/export', exportDuplicateOrganization)
