const router = require('express').Router()
const { listOfUsers,
    getUserInfo, updateUserRole, fetchUsersList, listOfEmployeeUsers } = require('./userHandler')
const authentication = require('../../middleware/authentication')
const { requestValidator } = require('../../lib/validations/requestValidator')
const { userIdSchema, updateUserSchema } = require('../../lib/validations/userValidations')
const roleBasedAccess = require('../../middleware/roleAuth')

router.use(authentication)
router.get('/list', roleBasedAccess('Access_Management'), fetchUsersList)
router.get('/', listOfUsers)
// Below users/employees is route for fetching employees who had requested user role.
// role in query params is string. Flow will be user --> userRole --> fetch user records including email --> filter those email in Employee table --> final result
router.get('/employees', listOfEmployeeUsers)
router.get('/:userId', requestValidator(userIdSchema), getUserInfo)
router.put('/:userId', roleBasedAccess('Access_Management'), requestValidator(userIdSchema, updateUserSchema), updateUserRole)
module.exports = router
