const Joi = require('@hapi/joi')
const ValidationCommonErrHandler = require('../commonValidations').validationCommonErrHandler

const validResourceTypes = ['hearse', 'utilityCar']

async function getVehiclesValidation (req, res, next) {
    const data = req.query
    const schema = {
        vehicleType: Joi.string().valid(validResourceTypes).error(ValidationCommonErrHandler)
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

module.exports = {
    getVehiclesValidation
}
