const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

async function validateDuplicateCases (req, res, next) {
    const data = req.query
    let sortOrders = ['asc', 'desc']

    const schema = Joi.object().keys({
        opiOrName: Joi.string().label('Opi or Name').error(validationCommonErrHandler),
        createdFrom: Joi.date().label('Created From').error(validationCommonErrHandler),
        createdTo: Joi.date().label('Created To').error(validationCommonErrHandler),
        sortOrder: Joi.string().valid(sortOrders).label('Sort order').error(validationCommonErrHandler),
        timezone: Joi.string().required().label('timezone').error(validationCommonErrHandler),
        arrangerId: Joi.string().label('Arranger').error(validationCommonErrHandler),
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

module.exports = exports = validateDuplicateCases
