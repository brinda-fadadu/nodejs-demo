const Joi = require('@hapi/joi')
const { personSchemaValidation, validationCommonErrHandler, addressValidation, regexForValidations, validateFunction } = require('./commonValidations')
const { customResponse } = require('../custom-response')

function personValidation (req, res, next) {
    const reqBodySchema = {
        ...personSchemaValidation(false),
        addressPlace: {
            id: Joi.number().allow('', null).error(validationCommonErrHandler),
            address: {
                ...addressValidation()
            }
        },
        dateOfDeath: Joi.date().allow('', null).label('Date of Death').less('now').error(validationCommonErrHandler),
        personVerificationDetails: {
            ssn: Joi.string().label('SSN').optional().regex(regexForValidations.SSN).allow('', null).error(validationCommonErrHandler)
        }
    }
    validateFunction(req.body, reqBodySchema, next, (err) => {
        if (err) {
            customResponse(422, err, res)
        }
    })
}

module.exports = {
    personValidation
}
