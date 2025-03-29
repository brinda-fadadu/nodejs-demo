const AgreementMemorialController = require('../../controllers/refactorControllers/agreementController/agreementMemorialController')
const _ = require('lodash')
const { customResponse } = require('../../lib/custom-response')
const { sendErrorResponse } = require('../../lib/errorResponse')

async function createOrUpdateAgreementMemorial (req, res, next) {
    try {
        const data = req.body
        data.userId = req.currentUser.id
        const { agreementId, action } = req.params
        const agreementMemorialController = new AgreementMemorialController(agreementId)
        const agreementMemorialItem = await agreementMemorialController.createOrUpdate(action, req.body)
        customResponse(200, agreementMemorialItem, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function deleteAgreementMemorial (req, res, next) {
    try {
        const { agreementId, memorialId } = req.params
        const { addendumId = null } = req.body
        const agreementMemorialController = new AgreementMemorialController(agreementId)
        const agreementMemorial = await agreementMemorialController.deleteMemorial(memorialId, addendumId, req.currentUser.id)
        customResponse(200, agreementMemorial, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function editMemorialItemQuantity (req, res, next) {
    try {
        const query = {
            ...req.body,
            ...req.query,
            ...req.params
        }
        const { agreementId, memorialId, itemId, addendumId = null, quantity } = query
        const agreementMemorialController = new AgreementMemorialController(agreementId)
        const agreementMemorial = await agreementMemorialController.editMemorialItemQuantity(memorialId, itemId, quantity, addendumId, req.currentUser.id)
        customResponse(200, agreementMemorial, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function listAgreementMemorials (req, res, next) {
    try {
        const data = req.body
        data.userId = req.currentUser.id
        const query = {
            ...req.query,
            ...req.params
        }
        const { agreementId, memorialTypeId } = query
        const agreementMemorialController = new AgreementMemorialController(agreementId)
        let agreementMemorialItems = await agreementMemorialController.getAgreementMemorials(memorialTypeId)
        agreementMemorialItems = _.groupBy(agreementMemorialItems, ele => {
            return ele.addendumNumber || ele.agreementNumber || ele.agreementId
        })
        customResponse(200, agreementMemorialItems, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

module.exports = {
    createOrUpdateAgreementMemorial,
    deleteAgreementMemorial,
    editMemorialItemQuantity,
    listAgreementMemorials
}
