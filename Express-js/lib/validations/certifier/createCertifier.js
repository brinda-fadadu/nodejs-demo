const Joi = require('@hapi/joi')
const { addressValidation } = require('../commonValidations')

async function validateCertifier (req, res, next) {
    const data = req.body
    const schema = Joi.object().keys({
        prefix: Joi.string().required().error(new Error('Prefix is required')),
        firstName: Joi.string().required().error(new Error('First name is required')),
        middleName: Joi.string().optional().allow('', null).error(new Error('Middle name should be string')),
        lastName: Joi.string().required().error(new Error('Last name is required')),
        licenseNumber: Joi.string().required().error(new Error('License number is required')),
        faxNumber: Joi.string()
            .required()
            .regex(
                /^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/
            ).error(new Error('Enter a valid fax number of length 10')),
        phoneNumber: Joi.string()
            .regex(
                /^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/
            ).optional()
            .allow('', null).error(new Error('Enter a valid phoneNumber of length 10')),
        address: await addressValidation()
    })

    Joi.validate(data, schema, (err, value) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            next()
        }
    })
}

module.exports = exports = validateCertifier
