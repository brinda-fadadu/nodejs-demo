const { validateFunction, validationCommonErrHandler } = require('./commonValidations')
const Joi = require('@hapi/joi')
const { customResponse } = require('../custom-response')

function postMethodValidation (req, res, next) {
    const schema = {
        description: Joi.string().allow('').error(validationCommonErrHandler),
        quantity: Joi.number().integer().min(1).required().error(validationCommonErrHandler),
        attributes: Joi.object().error(validationCommonErrHandler),
        vendor: Joi.object().error(validationCommonErrHandler),
        itemCategoryId: Joi.number().required().error(validationCommonErrHandler),
        code: Joi.string().allow('').error(validationCommonErrHandler),
        agreementId: Joi.number().required().error(validationCommonErrHandler),
        unitPrice: Joi.number().integer().error(validationCommonErrHandler),
        addendumId: Joi.number().label('AddendumId').error(validationCommonErrHandler)
    }
    const data = {
        ...req.body,
        ...req.params
    }
    validateFunction(data, schema, next, (err) => {
        customResponse(422, err, res)
    })
}

function listMethodValidation (req, res, next) {
    const data = {
        ...req.params,
        ...req.query
    }
    const schema = {
        agreementId: Joi.number().required().error(validationCommonErrHandler),
        offset: Joi.number().error(validationCommonErrHandler),
        limit: Joi.number().error(validationCommonErrHandler),
        itemCategoryId: Joi.number().error(validationCommonErrHandler),
        searchTerm: Joi.string().error(validationCommonErrHandler)
    }
    validateFunction(data, schema, next, (err) => {
        customResponse(422, err, res)
    })
}
function getAndRemoveMethodValidation (req, res, next) {
    const data = {
        ...req.params
    }
    const schema = {
        agreementId: Joi.number().required().error(validationCommonErrHandler),
        specialOrderRequestId: Joi.number().required().error(validationCommonErrHandler)
    }
    validateFunction(data, schema, next, (err) => {
        customResponse(422, err, res)
    })
}

function updateMethodValidation (req, res, next) {
    const schema = {
        description: Joi.string().allow('').error(validationCommonErrHandler),
        quantity: Joi.number().integer().min(1).required().error(validationCommonErrHandler),
        attributes: Joi.object().error(validationCommonErrHandler),
        vendor: Joi.object().error(validationCommonErrHandler),
        itemCategoryId: Joi.number().required().error(validationCommonErrHandler),
        code: Joi.string().allow('').error(validationCommonErrHandler),
        agreementId: Joi.number().required().error(validationCommonErrHandler),
        specialOrderRequestId: Joi.number().required().error(validationCommonErrHandler),
        unitPrice: Joi.number().integer().error(validationCommonErrHandler),
        addendumId: Joi.number().label('AddendumId').error(validationCommonErrHandler)
    }
    const data = {
        ...req.body,
        ...req.params
    }
    validateFunction(data, schema, next, (err) => {
        customResponse(422, err, res)
    })
}

module.exports = {
    postMethodValidation,
    listMethodValidation,
    getAndRemoveMethodValidation,
    updateMethodValidation
}
