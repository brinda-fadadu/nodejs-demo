const Joi = require('@hapi/joi')
const { sendErrorResponse } = require('../../errorResponse')

const ValidationCommonErrHandler = require('../commonValidations')
    .validationCommonErrHandler

const orderTypes = ['ASC', 'DESC']
const purchaseOrderStatus = ['ToBeOrdered', 'OnOrder', 'Received', 'Invalid']
const purchaseOrderDenyReason = ['Pull From Inventory', 'Item Not Available', 'Contract Cancelled', 'Return Inventory', 'Inventory', 'No Order', 'Pre-Buried']
const purchaseOrderItemStatus = ['Received', 'Shortage']

async function getPurchaseOrderValidation (req, res, next) {
    try {
        const data = req.query
        const schema = {
            status: Joi.string()
                .valid(purchaseOrderStatus)
                .error(ValidationCommonErrHandler),
            limit: Joi.number().max(20).error(new Error('Limit must be a number less than 20')),
            page: Joi.number().error(new Error('page must be a number')),
            searchTerm: Joi.string().error(new Error('Must be a string')),
            order: Joi.string()
                .valid(orderTypes)
                .error(ValidationCommonErrHandler)
        }

        Joi.validate(data, schema, (err, value) => {
            if (err) {
                console.log(err)
                res.status(422).json({
                    message: err.message
                })
            } else {
                next()
            }
        })
    } catch (error) {
        sendErrorResponse({
            statusCode: 422,
            message: error,
            name: 'VALIDATION_ERROR'
        }, res)
    }
}

async function generatePurchaseOrderFormValidation (req, res, next) {
    try {
        const data = {
            ...req.params,
            ...req.body
        }

        const schema = {
            purchaseOrderId: Joi.number().label('purchaseOrderId').required().error(ValidationCommonErrHandler),
            purchaseOrderItemId: Joi.number().label('purchaseOrderItemId').required().error(ValidationCommonErrHandler),
            alternateEmail: Joi.string().email().allow('', null).label('Email').error(ValidationCommonErrHandler)
        }

        Joi.validate(data, schema, (err, value) => {
            if (err) {
                console.log(err)
                res.status(422).json({
                    message: err.message
                })
            } else {
                next()
            }
        })
    } catch (error) {
        sendErrorResponse({
            statusCode: 422,
            message: error,
            name: 'VALIDATION_ERROR'
        }, res)
    }
}

async function previewPurchaseOrderFormValidation (req, res, next) {
    try {
        const data = req.params
        const schema = {
            purchaseOrderId: Joi.number().label('purchaseOrderId').required().error(ValidationCommonErrHandler),
            purchaseOrderItemId: Joi.number().label('purchaseOrderItemId').required().error(ValidationCommonErrHandler)
        }

        Joi.validate(data, schema, (err, value) => {
            if (err) {
                console.log(err)
                res.status(422).json({
                    message: err.message
                })
            } else {
                next()
            }
        })
    } catch (error) {
        sendErrorResponse({
            statusCode: 422,
            message: error,
            name: 'VALIDATION_ERROR'
        }, res)
    }
}

async function createOrEditPurchaseOrderValidation (req, res, next) {
    try {
        const params = req.params
        const body = req.body
        const paramSchema = {
            purchaseOrderId: Joi.string().alphanum().label('purchaseOrderId').required().error(ValidationCommonErrHandler)
        }
        const bodySchema = Joi.object().keys({
            item: Joi.object().keys({
                id: Joi.number().label('Purchase Order Item Id').error(ValidationCommonErrHandler),
                orderDenyReason: Joi.string().valid(purchaseOrderDenyReason).error(ValidationCommonErrHandler),
                quantity: Joi.number().label('Quantity').error(ValidationCommonErrHandler),
                price: Joi.number().label('Price').error(ValidationCommonErrHandler),
                shippingCost: Joi.number().label('Shipping Cost').error(ValidationCommonErrHandler),
                orderDate: Joi.date().label('Order Date').error(ValidationCommonErrHandler),
                expectedDeliveryDate: Joi.date().label('Expected Delivery Date').error(ValidationCommonErrHandler),
                receivedDate: Joi.date().label('Received Date').error(ValidationCommonErrHandler),
                orderStatus: Joi.string().valid(purchaseOrderItemStatus).error(ValidationCommonErrHandler),
                receivingDocumentNumber: Joi.string().allow('', null).label('Receiving Document Number').error(ValidationCommonErrHandler)
            }),
            timezone: Joi.string().label('timezone').required().error(ValidationCommonErrHandler)
        })
        Joi.validate(params, paramSchema, (err, value) => {
            if (err) {
                console.log(err)
                res.status(422).json({
                    message: err.message
                })
            } else {
                Joi.validate(body, bodySchema, (err, value) => {
                    if (err) {
                        console.log(err)
                        res.status(422).json({
                            message: err.message
                        })
                    } else {
                        next()
                    }
                })
            }
        })
    } catch (error) {
        sendErrorResponse({
            statusCode: 422,
            message: error,
            name: 'VALIDATION_ERROR'
        }, res)
    }
}

module.exports = {
    getPurchaseOrderValidation,
    createOrEditPurchaseOrderValidation,
    generatePurchaseOrderFormValidation,
    previewPurchaseOrderFormValidation
}
