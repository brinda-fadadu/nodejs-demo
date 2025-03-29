const { customResponse } = require('../../lib/custom-response')
const { sendErrorResponse } = require('../../lib/errorResponse')
const hmisController = require('../../services/hmis/hmisContractsController')
const HMISSyncValidationController = require('../../controllers/refactorControllers/HMISSyncValidationController/hmisSyncValidationController')
const HMISSyncController = require('../../services/hmis/hmisSyncController')

async function getListOfContracts (req, res, next) {
    try {
        const result = await hmisController.getListOfContracts(req.query)

        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function getHMISSyncStatus (req, res, next) {
    try {
        const result = await hmisController.getHMISSyncStatus(req.query.page, req.query.limit)

        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function getContractDetails (req, res, next) {
    try {
        const result = await hmisController.getContractDetails(req.params.contractId)

        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function linkContract (req, res, next) {
    try {
        const result = await hmisController.linkContract({ salesId: req.params.salesId, ...req.body }, req.currentUser)

        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function validateAgreement (req, res, next) {
    try {
        const hmisSyncValidationController = new HMISSyncValidationController(req.params.agreementId)
        const result = await hmisSyncValidationController.validateAgreement(req.body, req.currentUser)

        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function syncAgreement (req, res, next) {
    try {
        const hmisSyncController = new HMISSyncController(req.params.agreementId)
        const result = await hmisSyncController.syncAgreement(req.currentUser)

        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

/**
 * This method syncs Payments and ItemUsage for an agreement
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function reSyncAgreement (req, res, next) {
    try {
        const hmisSyncController = new HMISSyncController(req.params.agreementId)
        const result = await hmisSyncController.reSyncAgreement()
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

module.exports = {
    getListOfContracts,
    getContractDetails,
    linkContract,
    validateAgreement,
    syncAgreement,
    reSyncAgreement,
    getHMISSyncStatus
}
