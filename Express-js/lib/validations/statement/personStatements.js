const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

function validateParamsForListStatementsOfPerson (req, res, next) {
    const paramsSchema = {
        personId: Joi.number().required().label('Person Id').error(validationCommonErrHandler)
    }
    Joi.validate(req.params, paramsSchema, (err, value) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            next()
        }
    })
}

module.exports = {
    validateParamsForListStatementsOfPerson
}
