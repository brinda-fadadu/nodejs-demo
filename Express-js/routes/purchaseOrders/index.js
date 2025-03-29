const router = require('express').Router()
const { getPurchaseOrderValidation, createOrEditPurchaseOrderValidation, generatePurchaseOrderFormValidation, previewPurchaseOrderFormValidation } = require('../../lib/validations/purchaseOrders')
const { getPurchaseOrders, createOrEditPurchaseOrder, getPurchaseOrderDenyReason, getPurchaseOrderStatus, getOrderStatus, generatePurchaseOrderForm, previewPurchaseOrderForm, purchaseOrderItemChange } = require('./purchaseOrderHandler')
const roleBasedAccess = require('../../middleware/roleAuth')
const authentication = require('../../middleware/authentication')

router.use(authentication)
router.use(roleBasedAccess('Purchase_Order'))
router.get('/', getPurchaseOrderValidation, getPurchaseOrders)
router.put('/:purchaseOrderId', createOrEditPurchaseOrderValidation, createOrEditPurchaseOrder)
router.put('/:purchaseOrderId/generate-po-form/:purchaseOrderItemId', generatePurchaseOrderFormValidation, generatePurchaseOrderForm)
router.get('/:purchaseOrderId/preview-po-form/:purchaseOrderItemId', previewPurchaseOrderFormValidation, previewPurchaseOrderForm)
router.get('/deny-reasons', getPurchaseOrderDenyReason)
router.get('/purchase-order-status', getPurchaseOrderStatus)
router.get('/order-status', getOrderStatus)
router.put('/:purchaseOrderId/item-change', purchaseOrderItemChange)

module.exports = router
