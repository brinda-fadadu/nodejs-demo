const models = require('../models/index')

async function hasPolicy (userRoleId, moduleId, operation) {
    const getRoleAccess = await models.Permission.findOne({
        where: {
            userRoleId,
            moduleId,
            [operation]: true
        }
    })
    if (getRoleAccess !== null && getRoleAccess !== 'undefined') {
        return true
    } else {
        return false
    }
}

const roleAccess = (module, perm) => async (req, res, next) => {
    try {
        let opMap = {
            GET: 'read',
            POST: 'write',
            PUT: 'write',
            DELETE: 'delete'
        }
        const permission = perm || opMap[req.method]
        const moduleName = module || req.module

        const userDetails = await models.User.findOne({
            where: {
                id: req.currentUser.id
            }
        })
        const getModule = await models.Module.findOne({ where: { name: moduleName } })
        if (
            getModule &&
            (await hasPolicy(userDetails.userRoleId, getModule.id, permission))
        ) {
            next()
        } else {
            res.status(403).send(`The requested user don't have access to this API`)
        }
    } catch (err) {
        res.status(403).send(`The requested user don't have access to this API`)
    }
}

module.exports = exports = roleAccess
