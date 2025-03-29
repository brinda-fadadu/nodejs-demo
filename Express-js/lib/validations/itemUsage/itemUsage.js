
const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

async function itemUsageQueryValidation (req, res, next) {
    Joi.validate(req.query, Joi.object().keys({
        filter: Joi.string().required().valid('Properties', 'Merchandises', 'Services', 'Memorial', 'addOns').label('Filter').error(validationCommonErrHandler),
        page: Joi.number().required().label('Page').error(validationCommonErrHandler),
        limit: Joi.number().required().label('Limit').error(validationCommonErrHandler)
    }), { abortEarly: false }, (err) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

async function itemUsageUpdateValidation (req, res, next) {
    let bodySchema = {}
    if (req.body && !req.body.isDeleted) {
        if (['Merchandises', 'Services', 'addOns'].includes(req.body.resourceType)) {
            bodySchema = {
                resourceType: Joi.string().required().valid('Properties', 'Merchandises', 'Services', 'Memorial', 'addOns').label('Cemetry Type').error(validationCommonErrHandler),
                resourceId: Joi.number().required().allow(null).label('Agreement Location Id as resourceId').error(validationCommonErrHandler),
                isDeleted: Joi.boolean().required().label('isDeleted').error(validationCommonErrHandler)
            }
            if (req.body.resourceType === 'Services') {
                bodySchema['agreementType'] = Joi.number().required().allow(null).label('Agreement type  as resourceId').error(validationCommonErrHandler)
            }
        } else if (['Memorial'].includes(req.body.resourceType)) {
            bodySchema = {
                resourceType: Joi.string().required().valid('Properties', 'Merchandises', 'Services', 'Memorial', 'addOns').label('Cemetry Type').error(validationCommonErrHandler),
                resourceIds: Joi.array().required().allow(null).label('Agreement Memorial Ids as resourceIds').error(validationCommonErrHandler),
                isDeleted: Joi.boolean().required().label('isDeleted').error(validationCommonErrHandler)
            }
        } else {
            bodySchema = {
                resourceType: Joi.string().required().valid('Properties', 'Merchandises', 'Services', 'Memorial', 'addOns').label('Cemetry Type').error(validationCommonErrHandler),
                resourceId: Joi.number().required().allow(null).label('Agreement Location Id').error(validationCommonErrHandler),
                lotSpaceId: Joi.number().required().allow(null).label('Lot Space Id').error(validationCommonErrHandler),
                isDeleted: Joi.boolean().required().label('isDeleted').error(validationCommonErrHandler)
            }
        }
    } else {
        bodySchema = {
            itemUsageId: Joi.number().required().allow(null).label('item Usage Id').error(validationCommonErrHandler),
            isDeleted: Joi.boolean().required().label('isDeleted').error(validationCommonErrHandler)
        }
    }

    bodySchema.timezone = Joi.string().label('timezone').error(validationCommonErrHandler)

    if (Object.keys(req.body).length) {
        Joi.validate(req.params, Joi.object().keys({
            personId: Joi.number().required().label('Person Id').error(validationCommonErrHandler)
        }), { abortEarly: false }, (err) => {
            if (err) {
                res.status(422).json({
                    message: err.message
                })
            } else {
                Joi.validate(req.body, bodySchema, { abortEarly: false }, (err) => {
                    if (err) {
                        res.status(422).json({
                            message: err.message
                        })
                    } else {
                        next()
                    }
                })
            }
        })
    } else {
        res.status(422).json({
            message: `Input required`
        })
    }
}

async function itemUsageConfirmValidation (req, res, next) {
    let bodySchema = {
        itemUsageIds: Joi.array().items(Joi.number()).label('item usage').error(validationCommonErrHandler)
    }
    if (Object.keys(req.body).length) {
        Joi.validate(req.params, Joi.object().keys({
            personId: Joi.number().required().label('Person Id').error(validationCommonErrHandler)
        }), { abortEarly: false }, (err) => {
            if (err) {
                res.status(422).json({
                    message: err.message
                })
            } else {
                Joi.validate(req.body, bodySchema, { abortEarly: false }, (err) => {
                    if (err) {
                        res.status(422).json({
                            message: err.message
                        })
                    } else {
                        next()
                    }
                })
            }
        })
    } else {
        res.status(422).json({
            message: `Input required`
        })
    }
}

async function itemUsageReviewSelectionValidation (req, res, next) {
    Joi.validate(req.query, Joi.object().keys({
        itemType: Joi.string().required().valid('Merchandises', 'Services').label('itemType').error(validationCommonErrHandler)
    }), { abortEarly: false }, (err) => {
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
    itemUsageQueryValidation,
    itemUsageUpdateValidation,
    itemUsageConfirmValidation,
    itemUsageReviewSelectionValidation
}
