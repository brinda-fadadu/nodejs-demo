const Joi = require('@hapi/joi')
const ValidationCommonErrHandler = require('./commonValidations').validationCommonErrHandler

const userIdSchema = {
    userId: Joi.number().label('UserId').required().error(ValidationCommonErrHandler)
}

const updateUserSchema = {
    newRoleId: Joi.number().label('New Role Id').error(ValidationCommonErrHandler),
    businessUnitId: Joi.number().label('Business Unit').required().error(ValidationCommonErrHandler),
    managerId: Joi.number().allow(null).label('Reporting manager').error(ValidationCommonErrHandler),
    locationId: Joi.number().allow(null).label('Location Id').error(ValidationCommonErrHandler),
    team: Joi.array().items(Joi.number()).required().label('Team').error(ValidationCommonErrHandler)
}

module.exports = {
    userIdSchema,
    updateUserSchema
}
