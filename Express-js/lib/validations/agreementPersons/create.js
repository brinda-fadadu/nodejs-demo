const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')
const { getRolesOnType } = require('../../../utils/helpers/getListHelpers')
const { logger } = require('../../logger')

async function agreementPerson (req, res, next) {
    try {
        const agreementRoleIds = await getRolesOnType('Agreement')
        const schema = {
            firstName: Joi.string().required().regex(/^[a-zA-Z]*$/).label('First Name').error(validationCommonErrHandler),
            lastName: Joi.string().regex(/^[a-zA-Z]*$/).required().label('Last Name').error(validationCommonErrHandler),
            email: Joi.string().email().required().label('Email').error(validationCommonErrHandler),
            phoneNumber: Joi.string().regex(/^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/).allow(null, '').label('Phone Number').error(validationCommonErrHandler),
            middleName: Joi.string().regex(/^[a-zA-Z]*$/).label('Middle Name').allow(null, '').error(validationCommonErrHandler),
            agreementRoleIds: Joi.array().items(Joi.number().valid(agreementRoleIds)).required().label('Agreement Roles').error(validationCommonErrHandler)
        }
        Joi.validate(req.body, schema, (err, value) => {
            if (err) {
                res.status(422).json({
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

async function validateRouteParams (req, res, next) {
    try {
        const schema = {
            statementId: Joi.number().required().label('StatementId').error(validationCommonErrHandler)
        }
        if (req.params.agreementPersonId) {
            schema.agreementPersonId = Joi.number().required().label('AgreementPersonId').error(validationCommonErrHandler)
        }
        Joi.validate(req.params, schema, (err, value) => {
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

async function validateQueryParams (req, res, next) {
    try {
        const schema = {
            limit: Joi.number().label('Limit').error(validationCommonErrHandler),
            page: Joi.number().label('Page').error(validationCommonErrHandler)
        }
        Joi.validate(req.query, schema, (err, result) => {
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

module.exports = {
    agreementPerson,
    validateQueryParams,
    validateRouteParams
}
