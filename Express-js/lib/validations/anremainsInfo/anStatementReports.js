const Joi = require('@hapi/joi')

async function anStatementReportsValidation (req, res, next) {
    try {
        const data = req.query
        const schema = Joi.object().keys({
            limit: Joi.number().max(20).error(new Error('Limit must be a number less than 20')),
            page: Joi.number().error(new Error('page must be a number')),
            timezone: Joi.string().error(new Error('Must be a string')),
            agreementType: Joi.number().error(new Error('Must be a number')),
            contractNumber: Joi.string().error(new Error('Must be a string')),
            status: Joi.string().error(new Error('Must be a string')),
            decedentName: Joi.string().error(new Error('Must be a string')),
            locationId: Joi.number().error(new Error('Must be a number')),
            arrangerId: Joi.number().error(new Error('Must be a number')),
            submittedDateFrom: Joi.string().regex(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/)
                .error(() => 'Start Date format must be YYYY-MM-DD'),
            submittedDateTo: Joi.string().regex(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/)
                .error(() => 'Start Date format must be YYYY-MM-DD')
        })
        Joi.validate(data, schema, (err, value) => {
            if (err) {
                res.status(422).json({
                    error: err.message
                })
            } else {
                next()
            }
        })
    } catch (err) {
        console.log(err)
    }
}

async function exportStatementReportValidation (req, res, next) {
    try {
        const data = req.query
        const schema = Joi.object().keys({
            limit: Joi.number().max(20).error(new Error('Limit must be a number less than 20')),
            page: Joi.number().error(new Error('page must be a number')),
            timezone: Joi.string().error(new Error('Must be a string')),
            agreementType: Joi.number().error(new Error('Must be a number')),
            contractNumber: Joi.string().error(new Error('Must be a string')),
            status: Joi.string().error(new Error('Must be a string')),
            decedentName: Joi.string().error(new Error('Must be a string')),
            locationId: Joi.number().error(new Error('Must be a number')),
            arrangerId: Joi.number().error(new Error('Must be a number')),
            submittedDateFrom: Joi.string().regex(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/)
                .error(() => 'Start Date format must be YYYY-MM-DD'),
            submittedDateTo: Joi.string().regex(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/)
                .error(() => 'Start Date format must be YYYY-MM-DD')
        })
        Joi.validate(data, schema, (err, value) => {
            if (err) {
                res.status(422).json({
                    error: err.message
                })
            } else {
                next()
            }
        })
    } catch (err) {
        console.log(err)
    }
}

module.exports = {
    anStatementReportsValidation,
    exportStatementReportValidation
}
