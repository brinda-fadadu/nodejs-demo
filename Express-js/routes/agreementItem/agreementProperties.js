const { sendErrorResponse } = require('../../lib/errorResponse')
const { customResponse } = require('../../lib/custom-response')
const logger = require('../../lib/logger')
const SideBySidePropertyController = require('../../controllers/refactorControllers/agreementController/sideBySideProperty')
const AgreementPropertyController = require('../../controllers/refactorControllers/agreementController/agreementPropertiesController')
const AgreementPropertyAdditionalRights = require('../../controllers/refactorControllers/agreementController/agreementPropertyAdditionalRights')
const ReservationController = require('../../controllers/refactorControllers/agreementController/propertyReservationTypeController')
const _ = require('lodash')

exports.manageReservations = async (req, res, next) => {
    let result = {}
    try {
        const user = req.currentUser
        const agrmntId = req.params.agreementId
        let agreementPropertyController = new AgreementPropertyController(agrmntId)
        const {
            propertyId,
            addendumId,
            apiType
        } = req.body
        switch (req.body.reservationStatus) {
        case 'reserved':
            result = await agreementPropertyController.reserveProperty(propertyId, user, 'reserved', addendumId, apiType)
            break

        case 'confirmed':
            result = await agreementPropertyController.confirmProperty(propertyId, 'confirmed', user, addendumId, apiType)
            break

        case 'released':
            result = await agreementPropertyController.releaseProperty(propertyId, user, addendumId)
            break
        default:
            break
        }
        customResponse(201, result, res)
    } catch (err) {
        customResponse(400, err, res)
    }
}

exports.getProperties = async (req, res, next) => {
    try {
        const agrmntId = req.params.agreementId
        const { query } = req
        let agreementPropertyController = new AgreementPropertyController(agrmntId)
        let properties = await agreementPropertyController.reviewProperties(query)
        if (req.query.viewType === 'list') {
            properties = _.groupBy(properties, ele => {
                return ele.addendumNumber || ele.agreementNumber
            })
        }
        customResponse(200, properties, res)
    } catch (err) {
        customResponse(404, err, res)
    }
}

exports.updateAdditionalRights = async (req, res, next) => {
    try {
        const user = req.currentUser
        const { agreementId, agreementPropertyId, action } = req.params
        const agreementPropertyAdditionalRights = new AgreementPropertyAdditionalRights(agreementId, agreementPropertyId)
        const additionalRight = await agreementPropertyAdditionalRights.updateAdditionalRights(req.body, action, user)
        customResponse(201, additionalRight, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

exports.listingAdditionalRights = async (req, res, next) => {
    try {
        const { agreementId, agreementPropertyId } = req.params
        const agreementPropertyAdditionalRights = new AgreementPropertyAdditionalRights(agreementId, agreementPropertyId)
        const additionalRights = await agreementPropertyAdditionalRights.listAdditionalRights()
        customResponse(200, additionalRights, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

exports.createSideBySideProperty = async (req, res, next) => {
    try {
        const user = req.currentUser
        const { agreementId } = req.params
        const sideBySidePropertyController = new SideBySidePropertyController(agreementId)
        const sideBySideProperty = await sideBySidePropertyController.upsertSideBySideProperty(req.body, user)
        customResponse(201, sideBySideProperty, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

exports.updateSideBySideProperty = async (req, res, next) => {
    try {
        const user = req.currentUser
        const { agreementId, sideBySidePropertyId } = req.params
        const sideBySidePropertyController = new SideBySidePropertyController(agreementId, sideBySidePropertyId)
        await sideBySidePropertyController.getSideBySideProperty()
        const sideBySideProperty = await sideBySidePropertyController.upsertSideBySideProperty(req.body, user)
        customResponse(201, sideBySideProperty, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

exports.deleteSideBySideProperty = async (req, res, next) => {
    try {
        const user = req.currentUser
        const { agreementId, sideBySidePropertyId } = req.params
        const sideBySidePropertyController = new SideBySidePropertyController(agreementId, sideBySidePropertyId)
        await sideBySidePropertyController.getSideBySideProperty()
        const sideBySideProperty = await sideBySidePropertyController.deleteSideBySideProperty(user)
        customResponse(200, sideBySideProperty, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

exports.listSideBySideProperties = async (req, res, next) => {
    try {
        const { agreementId } = req.params
        const sideBySidePropertyController = new SideBySidePropertyController(agreementId)
        const sideBySideProperties = await sideBySidePropertyController.listSideBySideProperties()
        customResponse(200, sideBySideProperties, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

exports.removeUnusedItems = async (req, res, next) => {
    try {
        const { agreementId } = req.params
        const user = req.currentUser
        const agreementController = new AgreementPropertyController(agreementId)
        const items = await agreementController.removeItems(user.id)
        customResponse(200, items, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

exports.extensionRequest = async (req, res, next) => {
    try {
        const { agreementId, agreementPropertyId } = req.params
        const user = req.currentUser
        const reservationController = new ReservationController(agreementId)
        const extensionRequest = await reservationController.extendExpiryDate(agreementPropertyId, req.body, user)
        customResponse(200, extensionRequest, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

exports.downloadCertificateOfSepulcher = async (req, res, next) => {
    try {
        const { agreementId } = req.params
        let { timezone } = req.query
        const user = req.currentUser
        const agreementController = new AgreementPropertyController(agreementId)
        const downloadCertificateOfSepulcher = await agreementController.downloadCertificateOfSepulcher(user.id, timezone)
        res.set('Content-Type', 'application/octet-stream')
        res.set('Content-Disposition', `attachment; filename=${downloadCertificateOfSepulcher.downloadZipFileName}`)
        res.set('Content-Length', downloadCertificateOfSepulcher.bufferData.length)
        res.send(downloadCertificateOfSepulcher.bufferData)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

exports.getOwnersOfProperties = async (req, res, next) => {
    try {
        const { agreementId } = req.params
        const agreementController = new AgreementPropertyController(agreementId)
        const propertyOwners = await agreementController.getOwnersOfProperties()
        const showCertificateOfSepulcher = await agreementController.checkForCertificateOfSepulcher()
        const propertyOwnersData = {
            success: true,
            data: propertyOwners,
            showCertificateOfSepulcher
        }
        res.status(200).json(propertyOwnersData)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

exports.addAgreementPropertyOwner = async (req, res, next) => {
    try {
        const { agreementId, propertyId } = req.params
        const user = req.currentUser
        const agreementController = new AgreementPropertyController(agreementId)
        const propertyOwners = await agreementController.addAgreementPropertyOwner(propertyId, req.body, user)
        customResponse(200, propertyOwners, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

exports.deleteAgreementPropertyOwner = async (req, res, next) => {
    try {
        const { agreementId } = req.params
        const user = req.currentUser
        const agreementController = new AgreementPropertyController(agreementId, user.id)
        const propertyOwners = await agreementController.deleteAgreementPropertyOwner({ ...req.params, ...req.body }, user)
        customResponse(200, propertyOwners, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}
