const logger = require('../../lib/logger')
const { customResponse } = require('../../lib/custom-response')
const CAIcontroller = require('../../controllers/refactorControllers/agreementController/agreementCashAdvanceItemController')
const CACheckRequestcontroller = require('../../controllers/refactorControllers/checkRequestController/checkRequestController')
const { sendErrorResponse } = require('../../lib/errorResponse')

const instance = new CAIcontroller()

async function createORupdateCashAdvanceItem (req, res) {
    try {
        const data = req.body
        data.userId = req.currentUser.id
        data.agreementId = req.params.agreementId
        instance.agreementId = data.agreementId
        const cashAdvanceItemsresult = await instance.upsertCashAdvanceItem(data)
        customResponse(200, cashAdvanceItemsresult, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

async function getCashAdvanceItem (req, res) {
    try {
        const cashAdvanceItemsresult = await instance.getCashAdvanceItem(req.params.agreementCashAdvancedItemId)
        customResponse(200, cashAdvanceItemsresult, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

async function removeCashAdvanceItem (req, res) {
    try {
        let data = {}
        data.userId = req.currentUser.id
        data.agreementId = req.params.agreementId
        data.id = req.params.agreementCashAdvancedItemId
        if (req.body.addendumId) {
            data.addendumId = Number(req.body.addendumId)
        }
        if (req.body.timezone) {
            data.timezone = req.body.timezone
        }
        data.apiType = req.body.apiType
        const cashAdvanceItemsresult = await instance.removeCashAdvanceItem(data)
        customResponse(200, cashAdvanceItemsresult, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

async function cashAdvanceItemsChequeRequest (req, res, next) {
    try {
        // const { agreementId } = req.params
        const { agreementCashAdvancedItemIds } = req.body
        const checkRequestController = new CACheckRequestcontroller()
        // const cashAdvanceItemsresult = await instance.generateCashAdvanceItemsChequeRequest(agreementId, agreementCashAdvancedItemIds, req.currentUser)
        const checkRequestResult = await checkRequestController.CreateCACheckRequests(agreementCashAdvancedItemIds, req.currentUser.id)
        customResponse(200, checkRequestResult, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

module.exports = {
    createORupdateCashAdvanceItem,
    getCashAdvanceItem,
    removeCashAdvanceItem,
    cashAdvanceItemsChequeRequest
}
