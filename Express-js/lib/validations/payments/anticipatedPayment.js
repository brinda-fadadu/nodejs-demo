const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

async function anticipatedPaymentValidation (req, res, next) {
    const bodySchema = Joi.object().keys({
        'policyNumber': Joi.string().required().label('policyNumber').error(validationCommonErrHandler),
        'resourceId': Joi.number().required().label('resourceId').error(validationCommonErrHandler),
        'amount': Joi.number().required().max(999999).label('amount').error(new Error('Max Amount of 999999 is allowed')),
        'organizationId': Joi.number().required().label('organizationId').error(validationCommonErrHandler),
        'resourceType': Joi.string().required().label('resourceType').error(validationCommonErrHandler)
    })
    Joi.validate(req.body, bodySchema, (err, value) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            next()
        }
    })
}

async function getAnticipatedPaymentValidation (req, res, next) {
    const querySchema = Joi.object().keys({
        'resourceId': Joi.number().required().label('resourceId').error(validationCommonErrHandler)
    })
    Joi.validate(req.query, querySchema, (err, value) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            next()
        }
    })
}

async function receiveAmountValidation (req, res, next) {
    const bodySchema = Joi.object().keys({
        'anticipatedPaymentId': Joi.number().required().label('anticipatedPaymentId').error(validationCommonErrHandler),
        'referenceNumber': Joi.string().required().label('referenceNumber').error(validationCommonErrHandler),
        'receivedAt': Joi.string().required().label('organizationId').error(validationCommonErrHandler),
        'amount': Joi.number().required().max(999999).label('amount').error(new Error('Max Amount of 999999 is allowed'))
    })
    Joi.validate(req.body, bodySchema, (err, value) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            next()
        }
    })
}
module.exports = {
    anticipatedPaymentValidation,
    getAnticipatedPaymentValidation,
    receiveAmountValidation
}
