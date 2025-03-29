var router = require('express').Router()
const authentication = require('../../middleware/authentication')
const {
    createOrEditPlace,
    searchPlace,
    searchCallerOfPlace,
    fetchAndUpdatePrimaryOrg
} = require('./addressPlaceHandler')

router.use(authentication)
router.post('/', createOrEditPlace)
router.get('/search', searchPlace)
router.get('/:id/callers', searchCallerOfPlace)
router.post('/fetch-and-update', fetchAndUpdatePrimaryOrg)

module.exports = router
