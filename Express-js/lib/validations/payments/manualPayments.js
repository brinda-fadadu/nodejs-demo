const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')
const { PaymentTypes } = require('../../../config/seed').seed
const logger = require('../../logger')

function manualPaymentsValidation (req, res, next) {
    const paymentTypes = Object.keys(PaymentTypes).map(e => {
        return Number(e)
    })
    let reqBody = {
        resourceId: Joi.number()
            .required()
            .label('Resource Id')
            .error(validationCommonErrHandler),
        amount: Joi.number()
            .required()
            .label('Amount')
            .error(validationCommonErrHandler),
        paymentType: Joi.number()
            .valid(paymentTypes)
            .required()
            .label('Payment Type')
            .error(validationCommonErrHandler),
        payorId: Joi.number()
            .positive()
            .required()
            .label('Payor Id')
            .error(validationCommonErrHandler),
        remarks: Joi.string()
            .max(150)
            .allow('', null)
            .label('Remarks')
            .error(validationCommonErrHandler),
        resourceType: Joi.string()
            .required()
            .max(150)
            .allow('', null)
            .label('Resource Type')
            .error(validationCommonErrHandler),
        timeZone: Joi.string()
            .required()
            .label('Time Zone is required')
            .error(validationCommonErrHandler)
    }
    if ([2, 3, 7].includes(req.body.paymentType)) {
        reqBody['file'] = Joi.object().keys({
            url: Joi.string().required().label('Url').error(validationCommonErrHandler),
            folderName: Joi.string().required().label('foldername').error(validationCommonErrHandler),
            originalFileName: Joi.string().required().label('original file name').error(validationCommonErrHandler)
        })
        // Joi.string()
        //     .required()
        //     .label('File URL')
        //     .error(validationCommonErrHandler)
    }
    const reqBodySchema = Joi.object().keys(reqBody)
    let appendedSchema = reqBodySchema.append({})
    if (PaymentTypes[req.body.paymentType] !== 'Cash') {
        appendedSchema = reqBodySchema.append({
            referenceNumber: Joi.string()
                .required()
                .label('Reference Number')
                .error(validationCommonErrHandler)
        })
    }

    Joi.validate(req.body, appendedSchema, (err, value) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            next()
        }
    })
}

async function queryParamsValidation (req, res, next) {
    try {
        const schema = {
            resourceId: Joi.number()
                .required()
                .label('Resource Id')
                .error(validationCommonErrHandler),
            payorId: Joi.number()
                .label('payorId')
                .error(validationCommonErrHandler)
        }
        Joi.validate(req.query, schema, (err, value) => {
            if (err) {
                res.status(422).send({
                    error: err.message
                })
            } else {
                next()
            }
        })
    } catch (err) {
        logger.log('error', err)
        throw err
    }
}

async function voidPaymentValidation (req, res, next) {
    try {
        const schema = {
            voidType: Joi.string().required().valid(['Wrong Amount', 'Duplicated Entry', 'Incorrect Contract', 'Payment Method Change', 'Payment Return to Family', 'Credit Card Dispute', 'Credit Card Reversal', 'PNF AN Before Submit', 'Check - NSF', 'Check - Stop Payment', 'ACH Return', 'Check - Other', 'Payment Reconciliation']).label('Void Type').error(validationCommonErrHandler),
            voidedRemarks: Joi.string().required().max(100).label('Voided Remarks').error(validationCommonErrHandler)
        }
        Joi.validate(req.body, schema, (err, value) => {
            if (err) {
                res.status(422).send({
                    error: err.message
                })
            } else {
                next()
            }
        })
    } catch (err) {
        logger.log('error', err)
        throw err
    }
}

async function downloadPaymentReceiptValidation (req, res, next) {
    let data = {
        ...req.params
    }
    Joi.validate(data, Joi.object().keys({
        paymentId: Joi.number().required().label('Payment Id').error(validationCommonErrHandler)
    }), (err, value) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

module.exports = {
    manualPaymentsValidation,
    queryParamsValidation,
    voidPaymentValidation,
    downloadPaymentReceiptValidation
}
