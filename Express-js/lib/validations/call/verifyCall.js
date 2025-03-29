const Joi = require('@hapi/joi')
const { addressPlaceValidation, personSchemaValidation, validationCommonErrHandler, validateFunction, regexForValidations } = require('../commonValidations')
const { customResponse } = require('../../custom-response')

function verifyCall (req, res, next) {
    const paramsSchema = Joi.object().keys({
        callId: Joi.string().required()
    })

    Joi.validate(req.params, paramsSchema, async (err, value) => {
        if (err) {
            res.status(422).json({
                error: err
            })
        } else {
            let schema = Joi.object().keys({
                personType: Joi.string().required().valid([
                    'caller', 'informant', 'decedent', 'beneficiary'
                ]).label('personType').error(validationCommonErrHandler),
                unverifiedPersonId: Joi.number().label('unverifiedPersonId').error(validationCommonErrHandler),
                personInformation: {
                    ...personSchemaValidation(req.body.personType !== 'decedent'),
                    dateOfDeath: Joi.date()
                        .label('Date of Death')
                        .less('now')
                        .allow('', null)
                        .error(validationCommonErrHandler),
                    ssn: Joi.string().label('SSN').optional().regex(regexForValidations.SSN).allow('', null).error(validationCommonErrHandler),
                    addressPlace: {
                        ...addressPlaceValidation()
                    }
                },
                verifiedPersonId: Joi.number().label('verifiedPersonId').error(validationCommonErrHandler)
            })
            validateFunction(req.body, schema, next, (err) => {
                if (err) {
                    customResponse(422, err, res)
                }
            })
        }
    })
}

module.exports = exports = verifyCall
