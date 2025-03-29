const jwt = require('jsonwebtoken')
const models = require('../../models')
const { User } = require('../../models/index')
const LdapAuth = require('../../lib/ldap_auth')
const _ = require('lodash')

async function loginHandler (req, res, next) {
    let username = req.body.username
    let password = req.body.password
    // let role = req.body.userRole || 1 // super admin role
    let expireTime = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7)
    let ldap = new LdapAuth(username, password)
    let token
    ldap.connect()
        .then(async (ldapRes) => {
            const userData = ldapRes.data
            if (!ldapRes.success) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid username or password'
                })
                return
            }
            let user = await User.findOne({
                where: {
                    ldapId: userData['sAMAccountName']
                },
                include: [{
                    model: models.UserRole,
                    as: 'UserPermissions'
                }]
            })
            if (!user) {
                user = new User({ ldapId: userData['sAMAccountName'] })
            }
            let role = user.dataValues.userRoleId
            user.role = ((((user.dataValues || {}).UserPermissions || {}).dataValues || {}).description || null)
            user.name = userData['cn']
            user.email = !user.dataValues.email ? userData['userPrincipalName'] : user.dataValues.email// `${username}@gmail.com` //TODO:  remove this change later when user and employee issue is resolved
            // user.UserRoleId = userData['userrolefromldap'] //TODO: above create user will take role also.
            await user.save()
            const employee = await models.Employee.scope('withEmployeeLocation').findOne({
                where: {
                    email: user.email
                }
            })
            let location = ''
            if (employee) {
                location = _.get(employee, 'location.code')
                delete (employee.dataValues || {}).location
            }
            if (user.errors) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid username or password'
                })
                return
            }
            token = jwt.sign({
                id: userData['sAMAccountName'],
                exp: expireTime,
                role
            }, process.env.JWT_SECRET_TOKEN)
            res.set('AuthToken', token)
            res.status(200).json({
                success: true,
                userDetails: {
                    ldapId: user.dataValues.ldapId,
                    name: user.dataValues.name,
                    email: user.email,
                    profilePic: user.dataValues.profilePic,
                    location: location,
                    userRoleId: user.dataValues.userRoleId,
                    role: user.role,
                    employeeDetails: employee
                }

            })
        })
        .catch((err) => {
            if (err.name === 'InvalidCredentialsError') {
                res.status(401).json({
                    success: false,
                    message: 'Invalid username or password'
                })
            } else {
                next(err)
            }
        })
}

module.exports = loginHandler
