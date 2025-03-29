const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

async function validateEmployeesQuery (req, res, next) {
    const data = req.query

    const schema = Joi.object().keys({
        type: Joi.array().items(Joi.number()).error(validationCommonErrHandler),
        name: Joi.string().label('Name').error(validationCommonErrHandler),
        email: Joi.string().email().label('Email').error(validationCommonErrHandler),
        userRole: Joi.string().allow(null).label('userRole').error(validationCommonErrHandler)
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
}

module.exports = exports = validateEmployeesQuery
