const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('./commonValidations')
async function temporialBurialReportValidation (req, res, next) {
    const data = req.query
    let sortOrders = ['asc', 'desc']
    let status = ['In progress', 'Submitted']

    const schema = Joi.object().keys({
        contractNumber: Joi.string().label('Statement Number').error(validationCommonErrHandler),
        burialDateFrom: Joi.date().label('Burial Date From').error(validationCommonErrHandler),
        burialDateTo: Joi.date().label('Burial Date To').error(validationCommonErrHandler),
        limit: Joi.number().min(1).label('Limit').error(validationCommonErrHandler),
        page: Joi.number().min(1).label('Page').error(validationCommonErrHandler),
        arrangerId: Joi.number().allow(0).label('Arranger').error(validationCommonErrHandler),
        status: Joi.string().valid(status).label('Status').error(validationCommonErrHandler),
        decedent: Joi.string().label('Decedent Name').error(validationCommonErrHandler),
        sortOrder: Joi.string().valid(sortOrders).label('Sort order').error(validationCommonErrHandler),
        timezone: Joi.string().required().label('timezone').error(validationCommonErrHandler)
    })

    Joi.validate(data, schema, (err, value) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}
async function certifierReportValidation (req, res, next) {
    const data = req.query
    let sortOrders = ['asc', 'desc']

    const schema = Joi.object().keys({
        limit: Joi.number().min(1).label('Limit').error(validationCommonErrHandler),
        page: Joi.number().min(1).label('Page').error(validationCommonErrHandler),
        sortOrder: Joi.string().valid(sortOrders).label('Sort order').error(validationCommonErrHandler),
        timezone: Joi.string().required().label('timezone').error(validationCommonErrHandler)
    })

    Joi.validate(data, schema, (err, value) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}
async function organizationReportValidation (req, res, next) {
    const data = req.query
    let sortOrders = ['asc', 'desc']

    const schema = Joi.object().keys({
        limit: Joi.number().min(1).label('Limit').error(validationCommonErrHandler),
        page: Joi.number().min(1).label('Page').error(validationCommonErrHandler),
        sortOrder: Joi.string().valid(sortOrders).label('Sort order').error(validationCommonErrHandler),
        timezone: Joi.string().required().label('timezone').error(validationCommonErrHandler)
    })

    Joi.validate(data, schema, (err, value) => {
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
    temporialBurialReportValidation,
    certifierReportValidation,
    organizationReportValidation
}
