const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('./commonValidations')

async function validateDecedentTracking (req, res, next) {
    const data = req.query
    let sortOrders = ['asc', 'desc']
    let workOrderStatus = ['In progress', 'Submitted', 'Completed']

    const schema = Joi.object().keys({
        transferFromDate: Joi.date().label('Transfer From Date').error(validationCommonErrHandler),
        transferToDate: Joi.date().label('Transfer To Date').error(validationCommonErrHandler),
        locationId: Joi.number().label('Location').error(validationCommonErrHandler),
        propLocationId: Joi.number().label('Prep Room Location').error(validationCommonErrHandler),
        limit: Joi.number().min(1).label('Limit').error(validationCommonErrHandler),
        page: Joi.number().min(1).label('Page').error(validationCommonErrHandler),
        transferNumber: Joi.string().label('Transfer number').error(validationCommonErrHandler),
        name: Joi.string().label('Decedent Name').error(validationCommonErrHandler),
        arranger: Joi.number().allow(0).label('Arrenger').error(validationCommonErrHandler),
        status: Joi.string().valid(workOrderStatus).label('Status').error(validationCommonErrHandler),
        completionFromDate: Joi.date().label('Cempletion From Date').error(validationCommonErrHandler),
        completionToDate: Joi.date().label('Cempletion To Date').error(validationCommonErrHandler),
        cremationFromDate: Joi.date().label('Cremation From Date').error(validationCommonErrHandler),
        cremationToDate: Joi.date().label('Cremation To Date').error(validationCommonErrHandler),
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

module.exports = exports = validateDecedentTracking
