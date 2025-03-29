const { customResponse } = require('../../lib/custom-response')
const { sendErrorResponse } = require('../../lib/errorResponse')
const { userRoles } = require('../../config/seed')

async function userRolesHandler (req, res, next) {
    try {
        const roles = await userRoles('list')
        customResponse(200, roles, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

module.exports = {
    userRolesHandler
}
