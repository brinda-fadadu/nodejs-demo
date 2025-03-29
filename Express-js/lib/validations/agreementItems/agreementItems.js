const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

async function validateAgreementItems (req, res, next) {
    const paramsSchema = {
        agreementId: Joi.number().required().label('Agreement id').error(validationCommonErrHandler),
        action: Joi.string().required().valid(['remove', 'add']).label('Action').error(validationCommonErrHandler)
    }
    const bodySchema = {
        apiType: Joi.string().valid('quotation'),
        locationItemId: Joi.number().label('Location item id').error(validationCommonErrHandler),
        removeAll: Joi.boolean().default(false).label('Remove All').error(validationCommonErrHandler),
        addendumId: Joi.number().label('AddendumId').error(validationCommonErrHandler),
        agreementLocationItemId: Joi.number().label('AgreementLocationItemId').error(validationCommonErrHandler),
        timezone: Joi.string().label('timezone').error(validationCommonErrHandler)
    }

    Joi.validate(req.params, paramsSchema, (err, value) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            Joi.validate(req.body, bodySchema, (err, value) => {
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

module.exports = {
    validateAgreementItems
}
