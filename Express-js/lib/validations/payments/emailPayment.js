const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

async function emailPaymentValidation (req, res, next) {
    try {
        const schema = {
            payorId: Joi.number().required().label('Payor Id').error(validationCommonErrHandler),
            resourceId: Joi.number().required().label('Resource Id').error(validationCommonErrHandler),
            amount: Joi.number().positive().required().label('Amount').error(validationCommonErrHandler),
            timeZone: Joi.string().required().label('Time Zone is required').error(validationCommonErrHandler)
            // email: Joi.string().email().label('Email').error(validationCommonErrHandler),
            // billingAddress: Joi.object().label('Billing Address').error(validationCommonErrHandler)
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
        next(err)
    }
}

module.exports = {
    emailPaymentValidation
}
