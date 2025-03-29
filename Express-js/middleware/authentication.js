const jwt = require('jsonwebtoken')
const models = require('../models/index')
const moment = require('moment')

async function authToken (req, res, next) {
    const receivedToken = req.headers.authorization
    try {
        if (receivedToken) {
            const decodedToken = jwt.verify(receivedToken, process.env.JWT_SECRET_TOKEN)
            const userQuery = `SELECT [User].*, [UserPermissions].[id] AS [UserPermissions.id], [UserPermissions].[name] AS [UserPermissions.name], 
[UserPermissions].[group] AS [UserPermissions.group], [UserPermissions].[description] AS [UserPermissions.description] 
            FROM [User] AS [User]
            LEFT OUTER JOIN [UserRole] AS [UserPermissions] ON [User].[userRoleId] = [UserPermissions].[id]
            WHERE [User].[ldapId] = :ldapId
            ORDER BY [User].[id]`
            let users = await models.sequelize.query(userQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    ldapId: decodedToken.id
                }
            })
            /* const user = await models.User.findOne({
                where: {
                    ldapId: decodedToken.id
                },
                include: [
                    {
                        model: models.UserRole,
                        as: 'UserPermissions'
                    }
                ]
            }) */
            if (users[0]) {
                if (decodedToken.iat < moment(users[0].roleLastUpdatedAt).format('X')) {
                    res.status(401).json({
                        message: 'LOG_IN_AGAIN'
                    })
                } else {
                    users[0].role = decodedToken.role
                    req.currentUser = users[0]
                    next()
                }
            } else {
                res.status(401).json({
                    message: 'User not found'
                })
            }
        } else {
            res.status(401).json({
                message: 'Token not found'
            })
        }
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                message: error.message
            })
            return
        }
        next(error)
    }
}

module.exports = exports = authToken
