const express = require('express')
const router = express.Router({ mergeParams: true })
const {
    createOrEditRemainsInfo,
    createOrEditTransfer,
    deleteTransfer,
    listOfTransfers,
    remainsInfo,
    transferDetails,
    generateBodyTracking
} = require('./anRemainsHandler')
const {
    remainsInfoValidation,
    addTransferValidation
} = require('../../../lib/validations/caseInfo/anRemainsInfo')
const {
    anRemainsParamsSchema, anRemainsTransferParamsSchema
} = require('../../../lib/validations/caseInfo/paramsSchema')
const { requestValidator } = require('../../../lib/validations/requestValidator')
const authentication = require('../../../middleware/authentication')
const roleBasedAccess = require('../../../middleware/roleAuth')

router.use(authentication)
router.use(roleBasedAccess('Case_Info'))
router.get('/info', remainsInfo)
router.post('/info', remainsInfoValidation, createOrEditRemainsInfo)
router.put('/info/:remainsId', requestValidator(anRemainsParamsSchema), remainsInfoValidation, createOrEditRemainsInfo)
router.post('/transfer', addTransferValidation, createOrEditTransfer)
router.post('/generatebodytracking', generateBodyTracking)
router.put('/transfer/:transferId', requestValidator(anRemainsTransferParamsSchema), addTransferValidation, createOrEditTransfer)
router.get('/transfer', listOfTransfers)
router.get('/transfer/:transferId', requestValidator(anRemainsTransferParamsSchema), transferDetails)
router.delete('/transfer/:transferId', requestValidator(anRemainsTransferParamsSchema), deleteTransfer)

module.exports = router
