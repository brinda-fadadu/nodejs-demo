const router = require('express').Router()
const authentication = require('../../middleware/authentication')
const vehiclesHandler = require('./vehiclesHandler')
const { getVehiclesValidation } = require('../../lib/validations/vehicles')

router.use(authentication)

router.get('/', getVehiclesValidation, vehiclesHandler.getVehicles)

module.exports = router
