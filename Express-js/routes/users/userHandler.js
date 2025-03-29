const { getUsersList } = require('../../utils/dbGetFunctions')
const { sendErrorResponse } = require('../../lib/errorResponse')
const { customResponse } = require('../../lib/custom-response')
const UserController = require('../../controllers/refactorControllers/userController')

async function listOfUsers (req, res, next) {
    try {
        let users = await getUsersList(req.query.role, 'list')
        res.status(200).send({
            users
        })
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function getUserInfo (req, res, next) {
    try {
        const userController = new UserController('', req.params.userId)
        let userDetails = await userController.getUserDetails()
        res.status(200).send({
            userDetails
        })
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function updateUserRole (req, res, next) {
    try {
        const userController = new UserController('', req.params.userId)
        let userDetails = await userController.updateUserRole(req.body, req.currentUser.id)
        customResponse(200, userDetails, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function fetchUsersList (req, res, next) {
    try {
        const list = await UserController.getListOfUsers(req.query, req.currentUser)
        customResponse(200, list, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function listOfEmployeeUsers (req, res, next) {
    try {
        const list = await UserController.getListOfEmployeeUsers(req.query.role)
        customResponse(200, list, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

module.exports = {
    listOfUsers,
    getUserInfo,
    updateUserRole,
    fetchUsersList,
    listOfEmployeeUsers
}
