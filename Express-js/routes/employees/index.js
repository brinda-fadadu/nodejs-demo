const router = require('express').Router()
const authentication = require('../../middleware/authentication')

const getEmployeesValidation = require('../../lib/validations/employees/getEmployees')
const getEmployees = require('./getEmployees')

router.use(authentication)
router.get('/', getEmployeesValidation, getEmployees)

module.exports = router
