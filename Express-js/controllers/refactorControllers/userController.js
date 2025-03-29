const models = require('../../models/index')
const moment = require('moment')
const { userRoles, getEmployees } = require('../../config/seed')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const { getUsersList, getLocationIds } = require('../../utils/dbGetFunctions')

class UserController {
    /**
     *
     * @param {number} userRoleId role id of the user
     * @param {number} userId id of the user
     */
    constructor (userRoleId, userId) {
        this.userRoleId = userRoleId
        this.userId = userId
    }
    async getPermission () {
        let result = await models.UserRole.findOne({
            where: {
                id: this.userRoleId
            },
            include: [
                {
                    model: models.Module,
                    through: {
                        attributes: ['id', 'userRoleId', 'moduleId', 'read', 'write', 'delete']
                    }
                }
            ]
        })
        let permissionObj = {}
        result.Modules.map(moduleObj => {
            permissionObj[moduleObj.name] = { read: moduleObj.Permission.read, write: moduleObj.Permission.write, delete: moduleObj.Permission.delete }
            return permissionObj
        })
        let roleAndPermissionResult = {
            userRole: { id: result.id, name: result.name },
            permissions: permissionObj
        }
        return roleAndPermissionResult
    }

    // method to fetch the userDetails
    async getUserDetails (transaction) {
        const userDetails = await models.User.findOne({
            where: {
                id: this.userId
            },
            include: [
                {
                    model: models.UserRole,
                    as: 'UserPermissions'
                },
                {
                    model: models.Employee,
                    as: 'reportingManager',
                    required: false
                },
                {
                    model: models.BusinessUnit,
                    as: 'businessUnit',
                    required: false
                },
                {
                    model: models.Location,
                    as: 'location',
                    required: false
                },
                {
                    model: models.UserTeam,
                    as: 'userTeams',
                    where: {
                        deletedAt: null,
                        deletedBy: null
                    },
                    required: false,
                    include: [{
                        model: models.Team,
                        as: 'team'
                    }]
                }
            ],
            transaction
        })
        if (!userDetails) {
            throw new Error('USER_NOT_FOUND')
        }
        return userDetails
    }

    /**
     * method updates the role of the user
     * @param {number} newRoleId is the new roleId given to the user by Admin
     */
    async updateUserRole (reqBody, currentUserId) {
        let transaction = await models.sequelize.transaction()
        try {
            let inputPayload = []
            const userRoleIds = await userRoles('ids')
            if (!userRoleIds.includes(reqBody.newRoleId)) {
                throw new Error('INVALID_USER_ROLE')
            }
            const employees = await getEmployees()
            if (reqBody.managerId && !employees.includes(reqBody.managerId)) {
            // If no, throw an error saying Employee Not found
                throw new Error('MANAGER_NOT_FOUND')
            }
            const userTeams = reqBody.team
            const teams = await models.Team.findAll({
                where: {
                    id: { [Op.in]: userTeams }
                }
            })
            if (!(teams && teams.length)) {
                throw new Error('INVALID_TEAM')
            }
            //
            const location = await getLocationIds()
            if (reqBody.locationId) {
                if (!location.includes(reqBody.locationId)) {
                    throw new Error('Invalid Location')
                }
            }
            await models.User.update({
                id: this.userId,
                userRoleId: reqBody.newRoleId,
                reportingManagerId: reqBody.managerId,
                businessUnitId: reqBody.businessUnitId,
                locationId: reqBody.locationId,
                roleLastUpdatedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                updatedAt: moment().format('MM/DD/YYYY HH:mm:ss')
            }, {
                where: {
                    id: this.userId
                },
                transaction
            })
            const existingUserTeams = await models.UserTeam.findAll({
                where: {
                    userId: this.userId,
                    teamId: { [Op.in]: userTeams },
                    deletedAt: null,
                    deletedBy: null
                },
                attributes: ['teamId']
            })
            const existingTeams = existingUserTeams.map(team => team.teamId)
            await models.UserTeam.update({
                deletedBy: this.userId,
                deletedAt: moment().format('MM/DD/YYYY HH:mm:ss')
            }, {
                where: {
                    userId: this.userId,
                    teamId: { [Op.notIn]: existingTeams }
                },
                transaction
            })
            if (userTeams && userTeams.length) {
                userTeams.map(userTeamId => {
                    if (!existingTeams.includes(userTeamId)) {
                        let payload = {
                            userId: this.userId,
                            teamId: userTeamId,
                            createdBy: currentUserId,
                            updatedBy: currentUserId
                        }
                        inputPayload.push(payload)
                    }
                })
            }
            if (inputPayload && inputPayload.length > 0) {
                await models.UserTeam.bulkCreate(inputPayload, {
                    transaction
                })
            }
            const userDetails = await this.getUserDetails(transaction)
            await transaction.commit()
            return userDetails
        } catch (error) {
            await transaction.rollback()
            return error
        }
    }

    /**
     *
     * @param {object} reqQuery queries object for the method
     * @param {number} reqQuery.page the page number to fetch data
     * @param {number} reqQuery.limit number of records to fetch
     * @param {string} reqQuery.userName name of the user to find
     * @param {object} currentUser currently logged in user
     */
    static async getListOfUsers (reqQuery, currentUser) {
        const { userName, page, limit } = reqQuery
        const currentUserId = currentUser.id
        const queryObj = {}
        const whereObj = {
            id: {
                [Op.ne]: currentUserId
            }
        }
        if (userName) {
            whereObj.name = {
                [Op.like]: '%' + userName + '%'
            }
        }

        if (page && limit) {
            queryObj.offset = (Number(page) - 1) * (Number(limit))
        }
        if (limit) {
            queryObj.limit = Number(limit)
        }
        queryObj.limit = Number(limit)
        const list = await models.User.findAndCountAll({
            distinct: true,
            where: whereObj,
            ...queryObj,
            include: [
                {
                    model: models.UserTeam,
                    as: 'userTeams',
                    where: {
                        deletedAt: null,
                        deletedBy: null
                    },
                    required: false,
                    include: [{
                        model: models.Team,
                        as: 'team'
                    }]
                },
                {
                    model: models.Employee,
                    as: 'reportingManager',
                    required: false
                },
                {
                    model: models.BusinessUnit,
                    as: 'businessUnit',
                    required: false
                }
            ]
        })
        return list
    }

    static async getListOfEmployeeUsers (role) {
        try {
            let users = await getUsersList(role, 'list')
            const userEmaillist = users.map((user) => user.email)
            const employeeList = await models.Employee.findAll({
                where: {
                    isActive: true,
                    email: userEmaillist,
                    name: { [Op.notLike]: `%OV` }
                }
            })
            return employeeList
        } catch (err) {
            throw err
        }
    }
}

module.exports = UserController
