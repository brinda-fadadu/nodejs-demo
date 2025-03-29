const categoryController = require('../../controllers/refactorControllers/itemController/categoryController')
const CemeteryItemController = require('../../controllers/refactorControllers/itemController/cemeteryItemController')
const { sendErrorResponse } = require('../../lib/errorResponse')

exports.getItemCategories = async function (req, res, next) {
    try {
        const params = {
            ...req.params,
            ...req.query
        }
        const result = await categoryController.getCategories(params.itemTypeId, params.itemIndustryId, params.agreementId)
        res.status(200).send({
            itemCategories: result
        })
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

exports.getItemCategoryAttributes = async function (req, res, next) {
    try {
        const params = {
            ...req.params,
            ...req.query
        }
        const result = await categoryController.getCategoryAttributes(Number(params.itemCategoryId))
        res.status(200).send({
            attributes: result
        })
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

exports.getMemorialCategories = async function (req, res, next) {
    try {
        const params = {
            ...req.params,
            ...req.query
        }
        let cemeteryItemController = new CemeteryItemController(params.agreementId)
        const result = await cemeteryItemController.getMemorialCategories()
        res.status(200).send({
            ...result
        })
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

exports.getMonumentItems = async function (req, res, next) {
    try {
        const params = {
            ...req.params,
            ...req.query
        }
        const cemeteryItemController = new CemeteryItemController(params.agreementId)
        const result = await cemeteryItemController.getMonumentExceptionItems(null, JSON.parse(params.memorialTypeId), null)
        res.status(200).send({
            ...result
        })
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

exports.getMonumentExceptionItems = async function (req, res, next) {
    try {
        const params = {
            ...req.params,
            ...req.query
        }
        const cemeteryItemController = new CemeteryItemController(params.agreementId)
        const result = await cemeteryItemController.getMonumentExceptionItems(JSON.parse(params.propertyIds), JSON.parse(params.memorialTypeId), JSON.parse(params.isSideBySide))
        res.status(200).send({
            ...result
        })
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

exports.getMemorialItems = async function (req, res, next) {
    try {
        const params = {
            ...req.params,
            ...req.query
        }
        let propertyIds = params.propertyIds ? JSON.parse(params.propertyIds) : null
        const result = await CemeteryItemController.getMemorialItems(params.monumentItemId, params.agreementId, propertyIds)
        res.status(200).send({
            ...result
        })
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

exports.getMemorialProperties = async function (req, res, next) {
    try {
        const params = {
            ...req.query
        }
        const cemeteryItemController = new CemeteryItemController(params.agreementId)
        const result = await cemeteryItemController.getMemorialProperties(params.agreementId)
        res.status(200).send({
            ...result
        })
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

exports.getCashAdvanceItemsPrice = async function (req, res, next) {
    try {
        const params = {
            ...req.params
        }
        const result = await CemeteryItemController.getCashAdvanceItemsPrice(params.itemId)
        res.status(200).send({
            ...result
        })
    } catch (err) {
        sendErrorResponse(err, res)
    }
}
