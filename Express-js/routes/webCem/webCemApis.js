const { customResponse } = require('../../lib/custom-response')
const { sendErrorResponse } = require('../../lib/errorResponse')
const WebCemController = require('../../controllers/refactorControllers/webCemController/webCemController')
const webCemPropertyStatusController = require('../../controllers/refactorControllers/webCemController/webCemPropertyStatusController')
const webCemPropertyReservationController = require('../../controllers/refactorControllers/webCemController/webCemPropertyReservationController')
const logger = require('../../lib/logger')
const models = require('../../models')
const webCemPropertyController = require('../../controllers/refactorControllers/webCemController/webCemPropertyController')
async function getDecedentDetails (req, res, next) {
    try {
        const result = await WebCemController.fetchDecedentDetails(req.params.onePortalId)
        customResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
async function updateDecedentDetails (req, res, next) {
    try {
        const result = await WebCemController.updateDecedent(req.params.onePortalId, req.body)
        customResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
async function updateOwnerDetails (req, res, next) {
    try {
        const result = await WebCemController.updateOwner(req.params.onePortalId, req.body)
        customResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
async function personContacts (req, res, next) {
    try {
        const result = await WebCemController.fetchPersonContacts(req.params.onePortalId)
        customResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
async function getContractInformation (req, res, next) {
    try {
        const result = await WebCemController.getContractInformation(req.params.lot_sell_unit_id)
        customResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
async function getContractInformationByContractNumber (req, res, next) {
    const transaction = await models.sequelize.transaction()
    try {
        const lotSellUnitId = req.query ? req.query.lot_sell_unit_id : ''
        const result = await webCemPropertyReservationController.getContractInformationByContractNumber(req.params.contract_number, lotSellUnitId, transaction)
        await transaction.commit()
        customResponse(200, result, res)
    } catch (err) {
        await transaction.rollback()
        sendErrorResponse(err, res)
    }
}
async function getContractInformationByProperty (req, res, next) {
    const transaction = await models.sequelize.transaction()
    try {
        const result = await webCemPropertyReservationController.getContractByProperty(req.params.lot_sell_unit_id, transaction)
        await transaction.commit()
        customResponse(200, result, res)
    } catch (err) {
        await transaction.rollback()
        sendErrorResponse(err, res)
    }
}
async function getContractsByPurchaser (req, res, next) {
    const transaction = await models.sequelize.transaction()
    try {
        const lotSellUnitId = req.query ? req.query.lot_sell_unit_id : ''
        const result = await webCemPropertyReservationController.getContractDetailsByPurchaserOPI(req.params.onePortalId, lotSellUnitId, transaction)
        await transaction.commit()
        customResponse(200, result, res)
    } catch (err) {
        await transaction.rollback()
        sendErrorResponse(err, res)
    }
}
async function updatePropertyRights (req, res, next) {
    const transaction = await models.sequelize.transaction()
    try {
        const reqBodyObject = req.body
        const reqBody = {
            contractNumber: reqBodyObject.contractNumber,
            user: reqBodyObject.user,
            noOfRights: reqBodyObject.number_of_rights,
            canProceed: reqBodyObject.can_proceed,
            agreementId: reqBodyObject.agreementId
        }
        const result = await webCemPropertyReservationController.reserveProperty(req.params.lot_sell_unit_id, reqBody, transaction)
        logger.info(`Property reserved successfully `)
        await transaction.commit()
        customResponse(200, result, res)
    } catch (err) {
        logger.error(err.message)
        await transaction.rollback()
        sendErrorResponse(err, res)
    }
}
async function propertySaveSyncEvent (req, res, next) {
    try {
        const reqBody = {
            lotSellUnitId: req.params.lot_sell_unit_id,
            user: req.body.user
        }
        const result = await webCemPropertyController.triggerPropertySyncEvent(reqBody)
        customResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
async function updatePropertyStatus (req, res, next) {
    try {
        const reqBody = req.body
        const result = await webCemPropertyStatusController.updatePropertyStatus(req.params.lot_sell_unit_id, reqBody)
        customResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
module.exports = {
    getDecedentDetails,
    personContacts,
    getContractInformation,
    getContractInformationByContractNumber,
    getContractInformationByProperty,
    getContractsByPurchaser,
    updatePropertyRights,
    propertySaveSyncEvent,
    updatePropertyStatus,
    updateDecedentDetails,
    updateOwnerDetails
}
