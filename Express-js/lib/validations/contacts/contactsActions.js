const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')
const { validateFunction, validationResponse } = require('../validationFunctions')
const { getCaseRoleIdsOnContactType } = require('../../../utils/dbGetFunctions')
let paramsSchema, querysSchema, response

async function paramsValidation (req, res, next) {
    response = await validateFunction(req.params, paramsSchema)
    validationResponse(res, next, response)
}

exports.getContactDetailsValidation = async function getContactDetailsValidation (req, res, next) {
    paramsSchema = {
        personId: Joi.number().required().label('PersonId').error(validationCommonErrHandler),
        contactId: Joi.number().required().label('ContactId').error(validationCommonErrHandler)
    }
    paramsValidation(req, res, next)
}
exports.listContactsValidation = async function getListOfContacts (req, res, next) {
    let contactType = req.query.contactType ? req.query.contactType : [1, 2, 3]
    let roleIds = await getCaseRoleIdsOnContactType(contactType)
    paramsSchema = {
        personId: Joi.number().required().label('PersonId').error(validationCommonErrHandler)
    }
    querysSchema = {
        contactType: Joi.number().valid([1, 2, 3]).error(async errors => {
            return errors.map(err => {
                switch (err.type) {
                case 'any.allowOnly':
                    return new Error('ContactType should be from 1,2,3')
                case 'number.base':
                default:
                    return new Error('ContactType should be a number')
                }
            })
        }),
        caseRoles: Joi.array().items(Joi.number().required().valid(roleIds)).error(errors => {
            return errors.map(err => {
                switch (err.type) {
                case 'any.allowOnly':
                case 'array.includesOne':
                    return new Error(`CaseRoles should be from ${roleIds}`)
                case 'array.base':
                default:
                    return new Error('CaseRoles should be an array')
                }
            })
        }),
        getParentDetails: Joi.boolean().error(errors => {
            return errors.map(err => {
                switch (err.type) {
                case 'boolean.base':
                default:
                    return new Error(`getParentDetails must be a boolean`)
                }
            })
        })
    }
    Joi.validate(req.params, paramsSchema, (err, result) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            Joi.validate(req.query, querysSchema, (err, result) => {
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
