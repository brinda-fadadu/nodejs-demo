const { customResponse } = require('../../../lib/custom-response')
const VerifiedPersonController = require('../../../controllers/refactorControllers/personController/verifiedPersonController')
const { sendErrorResponse } = require('../../../lib/errorResponse')
const PersonController = require('../../../controllers/refactorControllers/personController/personController')
async function getNoks (req, res, next) {
    try {
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const nokDetails = await verifiedPersonController.getNokDetails()
        customResponse(200, nokDetails, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function getNokDetails (req, res, next) {
    try {
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const nokDetails = await verifiedPersonController.getContactDetails(req.params.nokId)
        customResponse(200, nokDetails, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
async function updateNokDetails (req, res, next) {
    try {
        let reqBody = {
            ...req.body,
            userId: req.currentUser.id
        }
        if (req.method === 'PUT') {
            reqBody.id = req.params.nokId
        }
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const nokDetails = await verifiedPersonController.addOrUpdateNok(reqBody)
        customResponse(200, nokDetails, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function getNotifierDetails (req, res, next) {
    try {
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const notifierDetails = await verifiedPersonController.getNotifierDetails()
        customResponse(200, notifierDetails, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function updateNotifierDetails (req, res, next) {
    try {
        let reqBody = {
            ...req.body,
            userId: req.currentUser.id
        }
        if (req.method === 'PUT') {
            reqBody.id = req.params.notifierId
        }
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const notifierDetails = await verifiedPersonController.addOrUpdateNotifer(reqBody)
        customResponse(200, notifierDetails, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function getParentsDetails (req, res, next) {
    try {
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const parentsDetails = await verifiedPersonController.getParentsDetails()
        customResponse(200, parentsDetails, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function updateParentsDetails (req, res, next) {
    try {
        let reqBody = {
            ...req.body,
            userId: req.currentUser.id
        }
        if (req.method === 'PUT') {
            reqBody.id = req.params.parentId
        }
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const parentsDetails = await verifiedPersonController.setParentsDetails(reqBody)
        customResponse(200, parentsDetails, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function searchNotifiers (req, res, next) {
    try {
        const notifiers = await PersonController.searchNotifiers(req.query.searchText, req.query.addressPlaceId)
        customResponse(200, notifiers, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

module.exports = {
    getNokDetails,
    updateNokDetails,
    getNotifierDetails,
    updateNotifierDetails,
    getParentsDetails,
    updateParentsDetails,
    getNoks,
    searchNotifiers
}
