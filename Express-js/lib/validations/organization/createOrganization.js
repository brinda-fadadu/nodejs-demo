const Joi = require('@hapi/joi')
const { validationCommonErrHandler, addressValidation } = require('../commonValidations')

async function createOrganizationValidation (req, res, next) {
    const bodySchema = Joi.object().keys({
        name: Joi.string().required().label('name').error(validationCommonErrHandler),
        organizationTypeId: Joi.number().required().label('organizationTypeId').error(validationCommonErrHandler),
        phoneNumber: Joi.string().regex(/^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/).label('phoneNumber').error(validationCommonErrHandler),
        licenseNumber: Joi.string().label('licenseNumber').error(validationCommonErrHandler),
        address: await addressValidation(),
        addressId: Joi.number().label('addressId').error(validationCommonErrHandler)
    })
    Joi.validate(req.body, bodySchema, (err, value) => {
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
    createOrganizationValidation
}
