const router = require('express').Router()
const authentication = require('../../middleware/authentication')
const agreementPersonHandler = require('./agreementPerson')

router.use(authentication)
router.post('/', agreementPersonHandler)

module.exports = router
