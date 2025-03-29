const Joi = require('@hapi/joi')
const { validationCommonErrHandler, addressValidation } = require('../commonValidations')

async function addingCardValidation (req, res, next) {
    const paramsSchema = {
        payorId: Joi.number().required().label('Payor Id').error(validationCommonErrHandler)
    }
    const bodySchema = {
        resourceId: Joi.number().required().label('resource Id').error(validationCommonErrHandler),
        cardToken: Joi.string().required().label('Card Token').error(validationCommonErrHandler)
    }
    Joi.validate(req.params, paramsSchema, (err, value) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
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
    })
}

async function listingCardsValidation (req, res, next) {
    const reqParamsSchema = {
        payorId: Joi.number().required().label('Payor Id').error(validationCommonErrHandler)
    }
    const querysSchema = {
        resourceId: Joi.number().required().label('resource Id').error(validationCommonErrHandler)
    }
    Joi.validate(req.params, reqParamsSchema, (err, value) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            Joi.validate(req.query, querysSchema, (err, value) => {
                if (err) {
                    res.status(422).json({
                        error: err.message
                    })
                } else {
                    next()
                }
            })
        }
    })
}

async function deleteCardValidation (req, res, next) {
    const paramsSchema = {
        payorId: Joi.number().required().label('Payor Id').error(validationCommonErrHandler),
        cardId: Joi.string().required().label('Card Id').error(validationCommonErrHandler)
    }
    const querysSchema = {
        resourceId: Joi.number().required().label('resource Id').error(validationCommonErrHandler)
    }
    Joi.validate(req.params, paramsSchema, (err, value) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            Joi.validate(req.query, querysSchema, (err, value) => {
                if (err) {
                    res.status(422).json({
                        error: err.message
                    })
                } else {
                    next()
                }
            })
        }
    })
}

async function cardPaymentsValidation (req, res, next) {
    const bodySchema = {
        resourceId: Joi.number().required().label('resource Id').error(validationCommonErrHandler),
        payorId: Joi.number().required().label('Payor Id').error(validationCommonErrHandler),
        cardId: Joi.string().required().label('Card Id').error(validationCommonErrHandler),
        amount: Joi.number().required().greater(0.5).label('Amount').error(validationCommonErrHandler),
        billingInformation: {
            name: Joi.string().label('Name').error(validationCommonErrHandler),
            email: Joi.string().email().allow('').label('Email').error(validationCommonErrHandler),
            address: await addressValidation()
        },
        resourceType: Joi.string().required().label('resourceType'),
        remarks: Joi.string().required().label('remarks'),
        timeZone: Joi.string().required().label('Time Zone is required').error(validationCommonErrHandler)
    }
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
    addingCardValidation,
    listingCardsValidation,
    deleteCardValidation,
    cardPaymentsValidation
}
