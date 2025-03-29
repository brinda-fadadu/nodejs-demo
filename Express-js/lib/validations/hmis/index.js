const Joi = require('@hapi/joi')
const { sendErrorResponse } = require('../../errorResponse')

const ValidationCommonErrHandler = require('../commonValidations')
    .validationCommonErrHandler

async function getContracts (req, res, next) {
    try {
        const data = req.query

        const schema = {
            firstName: Joi.string().regex(/^[a-zA-Z0-9- ]*$/).label('firstName').error(ValidationCommonErrHandler),
            lastName: Joi.string().regex(/^[a-zA-Z0-9- ]*$/).label('lastName').error(ValidationCommonErrHandler),
            limit: Joi.number().max(20).error(new Error('Limit must be a number less than 20')),
            page: Joi.number().error(new Error('page must be a number')),
            contractNumber: Joi.string().label('contractNumber').error(new Error('contractNumber Must be a string')),
            phoneNumber: Joi.string().regex(/^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/).label('phoneNumber').error(ValidationCommonErrHandler),
            dob: Joi.string().regex(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/)
                .error(() => 'Start Date format must be YYYY-MM-DD')
        }
        const requiredParams = ['firstName', 'lastName', 'contractNumber', 'phoneNumber', 'dob']
        if (data && Object.keys(data).length) {
            let query = 0
            for (const val in data) {
                if (requiredParams.includes(val) && data[val]) {
                    query++
                    break
                }
            }
            if (!query) {
                throw new Error('SEARCH_PARAM_REQUIRED')
            }
        } else {
            throw new Error('SEARCH_PARAM_REQUIRED')
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
            message: error.message
        }, res)
    }
}

async function getContractDetailsValidation (req, res, next) {
    try {
        const data = req.params

        const schema = {
            contractId: Joi.number().required().label('Contract Id').error(ValidationCommonErrHandler)
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
            message: error.message
        }, res)
    }
}

async function linkContractValidation (req, res, next) {
    const contractTypes = ['Funeral', 'Cemetery']
    try {
        const params = req.params
        const data = req.body
        const paramsSchema = {
            salesId: Joi.number().required().error(ValidationCommonErrHandler)
        }
        const bodySchema = {
            id: Joi.number().allow(null).error(ValidationCommonErrHandler),
            personId: Joi.number().required().error(ValidationCommonErrHandler),
            hmisContractNumber: Joi.string().required().label('hmisContractNumber').error(ValidationCommonErrHandler),
            hmisContractType: Joi.string().required().valid(contractTypes).error(ValidationCommonErrHandler),
            hmisSalesType: Joi.string().required().label('hmisSalesType').error(ValidationCommonErrHandler)
        }
        Joi.validate(params, paramsSchema, (err, value) => {
            if (err) {
                res.status(422).json({
                    message: err.message
                })
            } else {
                Joi.validate(data, bodySchema, (err, value) => {
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
    } catch (error) {
        sendErrorResponse({
            message: error.message
        }, res)
    }
}

async function agreementValidation (req, res, next) {
    try {
        const params = req.params
        const paramsSchema = {
            agreementId: Joi.number().required().label('Agreement Id').error(ValidationCommonErrHandler)
        }
        const bodySchema = {
            warningsAcknowledged: Joi.bool().allow(null).label('warningsAcknowledged').error(ValidationCommonErrHandler)
        }
        Joi.validate(params, paramsSchema, (err, value) => {
            if (err) {
                res.status(422).json({
                    message: err.message
                })
            } else {
                Joi.validate(req.body, bodySchema, (err) => {
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
    } catch (error) {
        sendErrorResponse({
            message: error.message
        }, res)
    }
}
module.exports = {
    getContracts,
    getContractDetailsValidation,
    linkContractValidation,
    agreementValidation
}
