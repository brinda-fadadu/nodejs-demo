const Joi = require('@hapi/joi')
const { validationCommonErrHandler, emailStringValidations } = require('./commonValidations')

function validateLogin (req, res, next) {
    const data = req.body

    let isEmailReq = emailStringValidations(true)

    const schema = {
        username: isEmailReq.label('User Name').error(validationCommonErrHandler),
        password: Joi.string().required().label('Password').error(validationCommonErrHandler),
        userRole: Joi.number()
    }

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

module.exports = exports = validateLogin
