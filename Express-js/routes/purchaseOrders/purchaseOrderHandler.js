const { customResponse } = require('../../lib/custom-response')
const { sendErrorResponse } = require('../../lib/errorResponse')
const PurchaseOrderController = require('../../controllers/refactorControllers/purchaseOrderController/purchaseOrderController')

async function getPurchaseOrders (req, res, next) {
    try {
        const query = req.query

        const result = await PurchaseOrderController.getListOfPurchaseOrders(req.query.status, query)

        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function createOrEditPurchaseOrder (req, res, next) {
    try {
        let purchaseOrderController = new PurchaseOrderController(req.params.purchaseOrderId)
        const result = await purchaseOrderController.updatePurchaseOrder(req.body, req.currentUser.id)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function getPurchaseOrderDenyReason (req, res, next) {
    try {
        const result = await PurchaseOrderController.getPurchaseOrderDenyReason()
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}
async function getPurchaseOrderStatus (req, res, next) {
    try {
        const result = await PurchaseOrderController.getPurchaseOrderStatus()
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}
async function getOrderStatus (req, res, next) {
    try {
        const result = await PurchaseOrderController.getOrderStatus()
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}
async function generatePurchaseOrderForm (req, res, next) {
    try {
        const result = await PurchaseOrderController.generatePurchaseOrderForm(req.params.purchaseOrderId, req.params.purchaseOrderItemId, req.currentUser, req.body.alternateEmail)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function previewPurchaseOrderForm (req, res, next) {
    try {
        let purchaseOrderController = new PurchaseOrderController(req.params.purchaseOrderId)
        const result = await purchaseOrderController.previewPurchaseOrderForm(req.params.purchaseOrderItemId)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function purchaseOrderItemChange (req, res, next) {
    try {
        let purchaseOrderController = new PurchaseOrderController(req.params.purchaseOrderId)
        const result = await purchaseOrderController.purchaseOrderItemChange(req.body, req.currentUser.id)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

module.exports = {
    getPurchaseOrders,
    createOrEditPurchaseOrder,
    getPurchaseOrderDenyReason,
    getPurchaseOrderStatus,
    getOrderStatus,
    generatePurchaseOrderForm,
    previewPurchaseOrderForm,
    purchaseOrderItemChange
}
