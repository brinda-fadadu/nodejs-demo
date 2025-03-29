const { customResponse } = require('../../lib/custom-response')
const { sendErrorResponse } = require('../../lib/errorResponse')
const WebCemAgreementController = require('../../controllers/refactorControllers/webCemController/webCemAgreementController')
async function getContractsForDecedents (req, res, next) {
    try {
        const result = await WebCemAgreementController.getContractsForDecedents(req.params.onePortalId)
        customResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
async function createOrUpdateContract (req, res, next) {
    try {
        const result = await WebCemAgreementController.createOrUpdateContract(req.body)
        customResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
async function getSaleTypeIds (req, res, next) {
    try {
        const result = await WebCemAgreementController.getDropdownValues(req.params.onePortalId, req.params.needType)
        customResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
// async function getEmployees (req, res, next) {
//     try {
//         const result = await WebCemAgreementController.getEmployees(req.params.onePortalId, req.params.needType)
//         customResponse(200, result, res)
//     } catch (error) {
//         sendErrorResponse(error, res)
//     }
// }
async function createAddendum (req, res, next) {
    try {
        const result = await WebCemAgreementController.createAddendum(req.body.contractId, req.body.arrangerId, req.body.user)
        customResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function fetchEhtnicity (req, res, next) {
    try {
        const result = await WebCemAgreementController.getEthnicityId()
        customResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
module.exports = {
    getContractsForDecedents,
    createOrUpdateContract,
    getSaleTypeIds,
    createAddendum,
    fetchEhtnicity
}
