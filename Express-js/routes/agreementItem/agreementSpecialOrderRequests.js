const { customResponse } = require('../../lib/custom-response')
const AgreementSpecialOrderRequestController = require('../../controllers/refactorControllers/agreementController/agreementSpecialOrderRequestController')
const { sendErrorResponse } = require('../../lib/errorResponse')

exports.addSpecialOrderRequest = async (req, res, next) => {
    try {
        const payload = req.body
        const agreementId = req.params.agreementId
        payload.userId = req.currentUser.id
        const result = await AgreementSpecialOrderRequestController.addSpecialOrderRequest(agreementId, payload)
        customResponse(201, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

exports.getSpecialOrderRequests = async (req, res, next) => {
    try {
        const agreementId = req.params.agreementId
        const payload = {
            ...req.query
        }
        const agreementSpecialOrderRequestController = new AgreementSpecialOrderRequestController(agreementId)
        const result = await agreementSpecialOrderRequestController.getSpecialOrderRequests(agreementId, payload)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

exports.updateSpecialOrderRequests = async (req, res, next) => {
    try {
        const agreementId = req.params.agreementId
        const payload = req.body
        payload.userId = req.currentUser.id
        payload.id = req.params.specialOrderRequestId
        const result = await AgreementSpecialOrderRequestController.updateSpecialOrderRequests(agreementId, payload)
        customResponse(201, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

exports.removeSpecialOrderRequest = async (req, res, next) => {
    try {
        const agreementId = req.params.agreementId
        const payload = {
            specialOrderRequestId: req.params.specialOrderRequestId,
            userId: req.currentUser.id,
            addendumId: req.body.addendumId
        }
        const result = await AgreementSpecialOrderRequestController.removeSpecialOrderRequests(agreementId, payload)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

exports.getSepcialOrderRequestById = async (req, res, next) => {
    try {
        const specialOrderRequestId = req.params.specialOrderRequestId
        const agreementId = req.params.agreementId
        const result = await AgreementSpecialOrderRequestController.getSpecialOrderRequestById(agreementId, specialOrderRequestId)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

exports.sendValidationEmail = async (req, res, next) => {
    try {
        const payload = {
            specialOrderRequestId: req.params.specialRequestId,
            userId: req.currentUser.id
        }
        const result = await AgreementSpecialOrderRequestController.sendApprovalRequest(req.params.agreementId, payload)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

exports.approveSpecialOrderRequests = async (req, res, next) => {
    try {
        const payload = {
            specialOrderRequestId: req.params.specialOrderRequestId,
            userId: req.currentUser.id,
            userRole: req.currentUser.role,
            code: req.body.code,
            addendumId: Number(req.body.addendumId),
            timezone: req.body.timezone
        }
        const result = await AgreementSpecialOrderRequestController.approveSpecialOrderRequests(req.params.agreementId, payload, req.file)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}
