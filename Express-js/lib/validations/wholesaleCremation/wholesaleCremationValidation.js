const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

const getListingValidation = {
    identifier: Joi.string().error(validationCommonErrHandler),
    status: Joi.number().error(validationCommonErrHandler),
    partners: Joi.array().error(validationCommonErrHandler),
    page: Joi.number().error(validationCommonErrHandler),
    limit: Joi.number().error(validationCommonErrHandler)
}
module.exports = {
    getListingValidation
}
