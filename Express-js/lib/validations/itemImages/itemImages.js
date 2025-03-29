const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')
const { getItemsRequestSchema, getPackagesRequestSchema } = require('../validationSchemas')

function itemListValidation () {
    const schema = {
        ...getItemsRequestSchema
    }
    delete schema.locationId
    delete schema.itemIndustryId
    return schema
}

function packagesListValidation () {
    const schema = {
        ...getPackagesRequestSchema
    }
    delete schema.locationId
    return schema
}

const itemCategoriesListValidation = {
    itemTypeId: Joi.number().required().error(validationCommonErrHandler)
}

module.exports = {
    itemListValidation,
    packagesListValidation,
    itemCategoriesListValidation
}
