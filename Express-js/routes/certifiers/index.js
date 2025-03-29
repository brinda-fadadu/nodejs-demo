const router = require('express').Router()
const authentication = require('../../middleware/authentication')
const checkOPIMiddleware = require('../../controllers/persons/caseOverview/caseInfo/checkOPIMiddleware')

const createCertifier = require('./createCertifier')
const getCertifiers = require('./getCertifiers')

const createCertifierValidation = require('../../lib/validations/certifier/createCertifier')

router.use(authentication)
router.get('/', getCertifiers)
router.use(checkOPIMiddleware)
router.post('/', createCertifierValidation, createCertifier)

module.exports = router
