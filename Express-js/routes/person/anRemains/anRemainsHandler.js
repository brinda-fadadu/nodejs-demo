const { customResponse } = require('../../../lib/custom-response')
const ANRemainsController = require('../../../controllers/refactorControllers/personController/anRemainsController')
const { sendErrorResponse } = require('../../../lib/errorResponse')

async function createOrEditRemainsInfo (req, res, next) {
    try {
        let reqBody = {
            ...req.body,
            personId: req.params.personId,
            userId: req.currentUser.id
        }
        if (req.method === 'PUT') {
            reqBody.id = req.params.remainsId
        }
        const anRemainsController = new ANRemainsController(req.params.personId)
        const remainsInfo = await anRemainsController.createOrEditANRemainsInfo(reqBody)
        customResponse(200, remainsInfo, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function remainsInfo (req, res, next) {
    try {
        const anRemainsController = new ANRemainsController(req.params.personId)
        const remainsInfo = await anRemainsController.getANRemainsInfo()
        customResponse(200, remainsInfo, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function createOrEditTransfer (req, res, next) {
    try {
        let reqBody = {
            ...req.body,
            personId: req.params.personId,
            userId: req.currentUser.id
        }
        if (req.method === 'PUT') {
            reqBody.id = req.params.transferId
        }
        const anRemainsController = new ANRemainsController(req.params.personId)
        const transfer = await anRemainsController.createOrEditTransfer(reqBody)
        customResponse(200, transfer, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function generateBodyTracking (req, res, next) {
    try {
        const anRemainsController = new ANRemainsController(req.params.personId)
        const transfer = await anRemainsController.generateBodyTracking(req.currentUser.id)
        customResponse(200, transfer, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function deleteTransfer (req, res, next) {
    try {
        const anRemainsController = new ANRemainsController(req.params.personId)
        const transfer = await anRemainsController.deleteTransfer(req.params.transferId, req.currentUser.id)
        customResponse(200, transfer, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function listOfTransfers (req, res, next) {
    try {
        const anRemainsController = new ANRemainsController(req.params.personId)
        const transfers = await anRemainsController.listTransfers()
        customResponse(200, transfers, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function transferDetails (req, res, next) {
    try {
        const anRemainsController = new ANRemainsController(req.params.personId)
        const transfer = await anRemainsController.getTransferDetails(req.params.transferId)
        customResponse(200, transfer, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
module.exports = {
    createOrEditRemainsInfo,
    createOrEditTransfer,
    deleteTransfer,
    listOfTransfers,
    remainsInfo,
    transferDetails,
    generateBodyTracking
}
