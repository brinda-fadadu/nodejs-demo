const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

async function anReportList (req, res, next) {
    const data = req.query
    let sortOrders = ['asc', 'desc']

    const schema = Joi.object().keys({
        locationId: Joi.number().label('Location').error(validationCommonErrHandler),
        decedent: Joi.string().label('Decedent').error(validationCommonErrHandler),
        arranger: Joi.number().label('Arranger').error(validationCommonErrHandler),
        callDateFrom: Joi.date().label('Call Date From').error(validationCommonErrHandler),
        callDateTo: Joi.date().label('Call Date To').error(validationCommonErrHandler),
        deathDateFrom: Joi.date().label('Death Date From').error(validationCommonErrHandler),
        deathDateTo: Joi.date().label('Death Date To').error(validationCommonErrHandler),
        removalDateFrom: Joi.date().label('Removal Date From').error(validationCommonErrHandler),
        removalDateTo: Joi.date().label('Removal Date To').error(validationCommonErrHandler),
        caseDateFrom: Joi.date().label('Case Date From').error(validationCommonErrHandler),
        caseDateTo: Joi.date().label('Case Date To').error(validationCommonErrHandler),
        appointmentDateFrom: Joi.date().label('Appointment Date From').error(validationCommonErrHandler),
        appointmentDateTo: Joi.date().label('Appointment Date To').error(validationCommonErrHandler),
        deathctrlDateFrom: Joi.date().label('Death Ctrl. Date From').error(validationCommonErrHandler),
        deathctrlDateTo: Joi.date().label('Death Ctrl. Date To').error(validationCommonErrHandler),
        validateDateFrom: Joi.date().label('Validation & Submitted Date From').error(validationCommonErrHandler),
        validateDateTo: Joi.date().label('Validation & Submitted Date To').error(validationCommonErrHandler),
        sortOrder: Joi.string().valid(sortOrders).label('Sort order').error(validationCommonErrHandler),
        timezone: Joi.string().required().label('timezone').error(validationCommonErrHandler),
        limit: Joi.number().min(1).label('Limit').error(validationCommonErrHandler),
        page: Joi.number().min(1).label('Page').error(validationCommonErrHandler)
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

module.exports = exports = anReportList
