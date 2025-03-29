const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

exports.validateListOfChapels = async function (req, res, next) {
    Joi.validate(req.query, Joi.object().keys({
        chapelType: Joi.string().required().label('Chapel type').error(validationCommonErrHandler),
        locationId: Joi.number().label('Location id').error(validationCommonErrHandler),
        chapelId: Joi.number().label('Chapel id').error(validationCommonErrHandler)
    }), (err, result) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            next()
        }
    })
}

exports.validateAvailabilityOfChapel = async function (req, res, next) {
    Joi.validate(req.query, Joi.object().keys({
        chapelId: Joi.number().required().error(validationCommonErrHandler),
        chapelDate: Joi.string().required().label('Chapel Date').error(validationCommonErrHandler),
        startTime: Joi.string().required().label('Start Time').error(validationCommonErrHandler),
        endTime: Joi.string().required().label('End Time').error(validationCommonErrHandler),
        timezone: Joi.string().label('timezone').required().error(validationCommonErrHandler),
        reservedChapelId: Joi.number().label('Chapel id').error(validationCommonErrHandler)
    }), (err, value) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            next()
        }
    })
}
