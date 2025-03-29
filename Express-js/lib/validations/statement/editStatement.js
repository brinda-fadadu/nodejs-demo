const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

async function validateEditReqBody (req, res, next) {
    const paramsSchema = {
        statementId: Joi.number().required().label('Statement Id').error(validationCommonErrHandler)
    }
    const bodySchema = {
        arrangerId: Joi.number().required().label('Arranger').error(validationCommonErrHandler),
        locationId: Joi.number(),
        saleType: Joi.number().allow(null, '').label('SaleType').error(validationCommonErrHandler),
        agreementPersons: Joi.array().required('AgreementPersons').error(validationCommonErrHandler),
        isFinanced: Joi.boolean().error(validationCommonErrHandler),
        agreementType: Joi.string().valid('funeral', 'cemetery').required()
    }
    if (req.body.agreementType === 'funeral') {
        bodySchema.locationId = Joi.number().required().label('Location').error(validationCommonErrHandler)
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
    validateEditReqBody
}
