const UserController = require('../../controllers/refactorControllers/userController')
const { customResponse } = require('../../lib/custom-response')
const { sendErrorResponse } = require('../../lib/errorResponse')

async function policyHandler (req, res, next) {
    try {
        if (req.currentUser.role) {
            const userController = new UserController(req.currentUser.role)
            const roleAndPermissions = await userController.getPermission()
            customResponse(200, roleAndPermissions, res)
        } else {
            res.status(403).json({
                message: 'Please contact Super Admin for Role access'
            })
        }
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

module.exports = policyHandler
