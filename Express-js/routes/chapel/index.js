const router = require('express').Router()

// authentication and autherization handlers
const authentication = require('../../middleware/authentication')

// api handlers
const { getListOfChapels, getAvailabilityOfChapel } = require('./chapel')

// validation handlers
const { validateListOfChapels, validateAvailabilityOfChapel } = require('../../lib/validations/chapel/chapel')

router.use(authentication)

router.get('/', validateListOfChapels, getListOfChapels)
router.get('/availability', validateAvailabilityOfChapel, getAvailabilityOfChapel)

module.exports = router
