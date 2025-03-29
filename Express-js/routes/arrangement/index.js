const router = require('express').Router()
const authentication = require('../../middleware/authentication')
const getArrangmentHandler = require('./getArrangement')
const statementHandler = require('./statement')
const getArrangmentServicesHandler = require('./getArrangementServices')

router.use(authentication)
router.get('/:arrangementId/arrangement', getArrangmentHandler)
router.get('/:arrangementId/statement/:statementId', statementHandler.get)
router.get('/:arrangementId/statements', statementHandler.list)
router.get('/:arrangementId/services', getArrangmentServicesHandler)

module.exports = router
