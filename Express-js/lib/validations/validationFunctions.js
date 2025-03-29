const Joi = require('@hapi/joi')

async function validateFunction (data, schema) {
    try {
        let validation = await Joi.validate(data, schema, (err, value) => {
            if (err) {
                return err.message
            } else {
                return true
            }
        })
        return validation
    } catch (error) {
        throw error
    }
}

function validationResponse (res, next, value) {
    if (value === true) {
        next()
    } else {
        res.status(422).json({
            error: value
        })
    }
}

module.exports = {
    validateFunction,
    validationResponse
}
