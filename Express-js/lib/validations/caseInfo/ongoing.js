const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

async function validateOngoingList (req, res, next) {
    const data = req.query
    const schema = Joi.object().keys({
        limit: Joi.number().min(1).label('Limit').error(validationCommonErrHandler),
        page: Joi.number().min(1).label('Page').error(validationCommonErrHandler),
        opiOrName: Joi.string().label('Opi or Name').error(validationCommonErrHandler),
        type: Joi.string().label('type').error(validationCommonErrHandler),
        employeeId: Joi.string().label('employee id').error(validationCommonErrHandler),
        apiType: Joi.string().label('apiType').error(validationCommonErrHandler)
    })

    Joi.validate(data, schema, (err, value) => {
        if (err) {
            res.status(422).json({
                message: err
            })
        } else {
            next()
        }
    })
}

module.exports = exports = validateOngoingList
