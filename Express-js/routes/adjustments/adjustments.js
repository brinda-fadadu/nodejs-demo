const logger = require('../../lib/logger')
const { customResponse } = require('../../lib/custom-response')
const { sendErrorResponse } = require('../../lib/errorResponse')
const Controller = require('../../controllers/refactorControllers/adjustmentController/discountsAndAdjustmentsHandler')

const instance = new Controller()

async function getAdjustments (req, res) {
    try {
        const result = await Controller.getListOfAdjustments(req.query)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function getListOfAgreementAdjustments (req, res) {
    try {
        let agreementAdjustments = await Controller.getAgreementAdjustments(req.params.agreementId)
        customResponse(200, agreementAdjustments, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

async function applyAdjustmentAsAgreementAdjustment (req, res) {
    try {
        let data = req.body
        data.agreementId = req.params.agreementId
        data.userId = req.currentUser.id
        data.requesterName = req.currentUser.name
        data.requesterRole = req.currentUser['UserPermissions.description']
        let result = await instance.createAgreementAdjustment(data)
        customResponse(200, result, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

async function removeAgreementAdjustment (req, res) {
    try {
        let result = await instance.removeAppliedAgreementAdjustment(req.params.agreementAdjustmentId, req.params.agreementId, req.currentUser.id)
        customResponse(200, result, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

async function createAdjustment (req, res) {
    try {
        const createdAdjustment = await instance.createPromocodeAdjustment(req)
        customResponse(201, createdAdjustment, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function getAdjustment (req, res) {
    try {
        const result = await instance.getPromocodeAdjustment(req.params.adjustmentId)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function updateAdjustment (req, res) {
    try {
        let data = req.body
        data.id = req.params.adjustmentId
        data.userId = req.currentUser.id
        const result = await instance.updatePromocodeAdjustment(data)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function deleteAdjustment (req, res) {
    try {
        const result = await instance.deletePromoAdjustment(req.params.adjustmentId, req.currentUser.id)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

module.exports = {
    getListOfAgreementAdjustments,
    removeAgreementAdjustment,
    applyAdjustmentAsAgreementAdjustment,
    getAdjustments,
    getAdjustment,
    createAdjustment,
    updateAdjustment,
    deleteAdjustment
}
