const Joi = require('@hapi/joi')
const { validationCommonErrHandler, validateFunction } = require('../commonValidations')
const { customResponse } = require('../../custom-response')

function createOrEditAgreementValidation (req, res, next) {
    let reqBodySchema

    if (req.body.apiType && req.body.apiType === 'quotation') {
        reqBodySchema = {
            apiType: Joi.string().required().label('apiType').error(validationCommonErrHandler),
            needType: Joi.number().required().error(validationCommonErrHandler),
            type: Joi.number().required().error(validationCommonErrHandler),
            arrangerId: Joi.number().required().label('Arranger').error(validationCommonErrHandler),
            saleTypeId: Joi.number().allow(null).label('saleTypeId').error(validationCommonErrHandler),
            locationId: Joi.number().label('Location').error(validationCommonErrHandler),
            persons: Joi.array().items(Joi.object().keys({
                id: Joi.number().allow('', null).error(validationCommonErrHandler),
                personId: Joi.number().required().label('personId').error(validationCommonErrHandler),
                agreementRoleId: Joi.number().required().label('agreementRoleId').error(validationCommonErrHandler),
                relationId: Joi.number().allow('', null).error(validationCommonErrHandler),
                isDeleted: Joi.boolean().error(validationCommonErrHandler)
            }))
        }
    } else {
        reqBodySchema = {
            saleTypeId: Joi.number().allow(null).label('saleTypeId').error(validationCommonErrHandler),
            needType: Joi.number().required().error(validationCommonErrHandler),
            type: Joi.number().required().error(validationCommonErrHandler),
            arrangerId: Joi.number().required().label('Arranger').error(validationCommonErrHandler),
            locationId: Joi.number().required().error(validationCommonErrHandler),
            persons: Joi.array().items(Joi.object().keys({
                id: Joi.number().allow('', null).error(validationCommonErrHandler),
                personId: Joi.number().required().label('personId').error(validationCommonErrHandler),
                agreementRoleId: Joi.number().required().label('agreementRoleId').error(validationCommonErrHandler),
                relationId: Joi.number().allow('', null).error(validationCommonErrHandler),
                isDeleted: Joi.boolean().error(validationCommonErrHandler)
            })),
            apiType: Joi.string().allow('', null).label('apiType').error(validationCommonErrHandler),
            isCancelled: Joi.boolean().allow(null)
        }
    }

    if (req.method === 'PUT') {
        reqBodySchema.id = Joi.number().allow('', null).error(validationCommonErrHandler)
    }
    validateFunction(req.body, reqBodySchema, next, (err) => {
        if (err) {
            customResponse(422, err, res)
        }
    })
}

function editAddendumValidations (req, res, next) {
    const reqBodySchema = {
        persons: Joi.array().items(Joi.object().keys({
            id: Joi.number().allow('', null).error(validationCommonErrHandler),
            personId: Joi.number().required().label('personId').error(validationCommonErrHandler),
            agreementRoleId: Joi.number().required().label('agreementRoleId').error(validationCommonErrHandler),
            relationId: Joi.number().allow('', null).error(validationCommonErrHandler),
            isDeleted: Joi.boolean().error(validationCommonErrHandler)
        })).required().error(validationCommonErrHandler)
    }
    validateFunction(req.body, reqBodySchema, next, (err) => {
        if (err) {
            customResponse(422, err, res)
        }
    })
}

module.exports = {
    createOrEditAgreementValidation,
    editAddendumValidations
}
