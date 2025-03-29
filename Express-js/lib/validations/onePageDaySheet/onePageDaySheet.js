
const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

let obj = {
    serviceFromDate: Joi.date().required().label('From Date').error(validationCommonErrHandler),
    serviceToDate: Joi.date().required().label('To Date').error(validationCommonErrHandler),
    timezone: Joi.string().required().label('Time Zone').error(validationCommonErrHandler),
    locations: Joi.array().items(Joi.number()).required().label('Location').error(validationCommonErrHandler)
}

async function onePageDaySheetValidation (req, res, next) {
    let daysheet = { ...obj }
    daysheet.page = Joi.number().required().label('Page').error(validationCommonErrHandler)
    daysheet.limit = Joi.number().required().label('limit').error(validationCommonErrHandler)
    validate(req, res, daysheet, next)
}

async function sendOnePageDaySheetEmailValidation (req, res, next) {
    validate(req, res, obj, next)
}

async function validate (req, res, obj, next) {
    Joi.validate(req.query, Joi.object().keys(obj), { abortEarly: false }, (err) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

module.exports = {
    onePageDaySheetValidation,
    sendOnePageDaySheetEmailValidation
}
