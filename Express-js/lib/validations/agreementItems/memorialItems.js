const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

exports.validateCreateMemorial = (req, res, next) => {
    let reqBodySchema = {
        id: Joi.number().label('agreementMemorialId').error(validationCommonErrHandler),
        memorialTypeId: Joi.number().required().label('memorialTypeId').error(validationCommonErrHandler),
        items: Joi.array().min(1).label('memorialItems').items(
            Joi.object().keys({
                itemId: Joi.number().required().label('Item id').error(validationCommonErrHandler),
                itemType: Joi.string().required().label('Item Type').error(validationCommonErrHandler),
                locationItemId: Joi.number().required().label('Location item id').error(validationCommonErrHandler)
            })
        ),
        apiType: Joi.string().label('apiType').error(validationCommonErrHandler)
    }
    if (!req.body.apiType) {
        reqBodySchema.addendumId = Joi.number().required().label('addendumId').error(validationCommonErrHandler)
    }
    Joi.validate(req.body, Joi.object().keys(reqBodySchema), (err, value) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

exports.validateGetMemorials = (req, res, next) => {
    let queryParams = { ...req.query, ...req.params }
    Joi.validate(queryParams, Joi.object().keys({
        agreementId: Joi.number().required().label('agreementId').error(validationCommonErrHandler),
        memorialTypeId: Joi.number().required().label('memorialTypeId').error(validationCommonErrHandler)
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

exports.validateDeleteMemorial = (req, res, next) => {
    Joi.validate(req.params, Joi.object().keys({
        agreementId: Joi.number().required().label('agreementId').error(validationCommonErrHandler),
        addendumId: Joi.number().label('addendumId').error(validationCommonErrHandler),
        memorialId: Joi.number().required().label('agreementMemorialId').error(validationCommonErrHandler)
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

exports.validateMemorialItem = (req, res, next) => {
    let queryParams = { ...req.params, ...req.body }
    Joi.validate(queryParams, Joi.object().keys({
        agreementId: Joi.number().required().label('agreementId').error(validationCommonErrHandler),
        memorialId: Joi.number().required().label('agreementMemorialId').error(validationCommonErrHandler),
        quantity: Joi.number().required().label('quantity').error(validationCommonErrHandler),
        itemId: Joi.number().required().label('Item id').error(validationCommonErrHandler),
        addendumId: Joi.number().label('addendumId').error(validationCommonErrHandler)
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
