const WholeSaleCremationController = require('../../controllers/refactorControllers/miscSalesController/wholeSalesController')
const { customResponse } = require('../../lib/custom-response')
const { sendErrorResponse } = require('../../lib/errorResponse')

async function getListOfWholeSaleCremation (req, res, next) {
    try {
        const miscSales = await WholeSaleCremationController.getListOfWholeSaleCremation(req.query)
        customResponse(200, miscSales, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
async function createWholeSaleDecedents (req, res, next) {
    try {
        req.body.userId = req.currentUser.id
        const decedents = await WholeSaleCremationController.createDecedents(req.body)
        customResponse(200, decedents, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function createWholeSaleCremation (req, res, next) {
    try {
        const wholeSaleCremation = await WholeSaleCremationController.createWholeSaleCremation(req.body)
        customResponse(200, wholeSaleCremation, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function editWholeSaleCremation (req, res, next) {
    try {
        const wholeSaleCremationController = new WholeSaleCremationController(req.params.wholeSaleId)
        const wholeSaleCremation = await wholeSaleCremationController.editWholeSaleCremation(req.body)
        customResponse(200, wholeSaleCremation, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function createWholeSaleCremationItems (req, res, next) {
    try {
        const user = req.currentUser
        const wholeSaleCremationController = new WholeSaleCremationController(req.params.wholeSaleId)
        const wholeSaleCremation = await wholeSaleCremationController.createOrUpdateWholeSaleCremationItems(req.body, req.currentUser.id, req.params)
        await wholeSaleCremationController._updateAgreementAdjustment(user.id)
        customResponse(200, wholeSaleCremation, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function editWholeSaleCremationItems (req, res, next) {
    try {
        const user = req.currentUser
        const wholeSaleCremationController = new WholeSaleCremationController(req.params.wholeSaleId)
        const wholeSaleCremation = await wholeSaleCremationController.createOrUpdateWholeSaleCremationItems(req.body, req.currentUser.id, req.params)
        await wholeSaleCremationController._updateAgreementAdjustment(user.id)
        customResponse(200, wholeSaleCremation, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function getWholeSaleDetails (req, res, next) {
    try {
        const wholeSaleCremationController = new WholeSaleCremationController(req.params.wholeSaleId)
        const wholeSaleCremation = await wholeSaleCremationController.getWholeSaleCremationDetails()
        customResponse(200, wholeSaleCremation, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function getWholeSaleItems (req, res, next) {
    try {
        const wholeSaleCremationController = new WholeSaleCremationController(req.params.wholeSaleId)
        const selectedItems = await wholeSaleCremationController.getWholeSaleCremationItems()
        customResponse(200, selectedItems, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function getCategories (req, res, next) {
    try {
        const categories = await WholeSaleCremationController.getCategories(req.query.itemTypeId)
        customResponse(200, categories, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

module.exports = {
    getListOfWholeSaleCremation,
    createWholeSaleDecedents,
    createWholeSaleCremation,
    editWholeSaleCremation,
    getWholeSaleDetails,
    getWholeSaleItems,
    createWholeSaleCremationItems,
    editWholeSaleCremationItems,
    getCategories
}
