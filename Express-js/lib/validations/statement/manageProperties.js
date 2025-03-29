const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

async function validateManageProperties (req, res, next) {
    const paramsSchema = {
        statementId: Joi.number().required().label('Statement Id').error(validationCommonErrHandler)
    }
    const bodySchema = {
        propertyId: Joi.number().required(),
        reservationStatus: Joi.string().valid('reserved', 'confirmed', 'released').required()
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
    validateManageProperties
}
