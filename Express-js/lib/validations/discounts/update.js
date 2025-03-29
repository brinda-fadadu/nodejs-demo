const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

async function updatePromoCodeValidator (req, res, next) {
    const bodySchema = Joi.object().keys({
        title: Joi.string().required().max(40).label('Title').error(validationCommonErrHandler),
        description: Joi.string().optional().max(100).allow('', null).label('Description').error(validationCommonErrHandler),
        startDate: Joi.date().required().label('StartDate').error(validationCommonErrHandler),
        endDate: Joi.date().required().min(Joi.ref('startDate')).label('EndDate').error(validationCommonErrHandler),
        isActive: Joi.boolean().required().label('IsActive').error(validationCommonErrHandler)
    })
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

module.exports = exports = updatePromoCodeValidator
