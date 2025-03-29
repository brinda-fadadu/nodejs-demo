const router = require('express').Router()

const authentication = require('../../middleware/authentication')
const { createOrEditCall,
    getCallInfo,
    listCalls,
    bulkDeleteCallsHandler,
    exportCallsHandler,
    verifyCall,
    listNotes,
    createNotes,
    listDuplicates,
    exportDuplicateCallsHandler
} = require('./callsHandler')
const createNoteValidation = require('../../lib/validations').note

const createCallValidation = require('../../lib/validations').createCall
const getCallValidation = require('../../lib/validations').getCall
const editCallValidation = require('../../lib/validations').editCall
const listCallsValidation = require('../../lib/validations').listCalls
const bulkDeleteCallsValidation = require('../../lib/validations').bulkDeleteCalls
const verifyCallValidation = require('../../lib/validations').verifyCall
const validateDuplicateCalls = require('../../lib/validations').validateDuplicateCalls
const roleBasedAccess = require('../../middleware/roleAuth')

router.use(authentication)
router.post('/:callId/verify-person', roleBasedAccess('Call_Verification'), verifyCallValidation, verifyCall)
router.post('/delete', roleBasedAccess('Calls', 'DELETE'), bulkDeleteCallsValidation, bulkDeleteCallsHandler)

router.use(roleBasedAccess('Calls'))

router.get('/export', exportCallsHandler)
router.get('/duplicate', validateDuplicateCalls, listDuplicates)
router.get('/duplicate/export', exportDuplicateCallsHandler)
router.get('/:callId', getCallValidation, getCallInfo)
router.put('/:callId', editCallValidation, createOrEditCall)
router.get('/', listCallsValidation, listCalls)
router.post('/', createCallValidation, createOrEditCall)
router.get('/:callId/notes', listNotes)
router.post('/:callId/notes', createNoteValidation, createNotes) // Needs resourceType, doesn't need categoryId

module.exports = exports = router
