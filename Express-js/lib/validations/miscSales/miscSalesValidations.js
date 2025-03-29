const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

const createOrEditValidation = {
    personId: Joi.number().required().label('PersonId').error(validationCommonErrHandler),
    arrangerId: Joi.number().required().label('Arranger').error(validationCommonErrHandler),
    locationId: Joi.number().required().error(validationCommonErrHandler),
    decedent: Joi.number().label('Decedent').error(validationCommonErrHandler),
    saleTypeId: Joi.number().label('Sale Type').required().error(validationCommonErrHandler),
    status: Joi.string().label('status').error(validationCommonErrHandler)
}

const editRequestParamValidation = {
    miscId: Joi.number().error(validationCommonErrHandler)
}

const getListingValidation = {
    salesStatus: Joi.array().items(Joi.string()).allow(null).label('saleStatus').error(validationCommonErrHandler),
    locationId: Joi.array().items(Joi.number()).allow(null).label('locaationId').error(validationCommonErrHandler),
    arrangerId: Joi.array().items(Joi.number()).allow(null).label('arrangerId').error(validationCommonErrHandler),
    miscSalesId: Joi.string().label('MiscSalesId').error(validationCommonErrHandler),
    name: Joi.string().error(validationCommonErrHandler),
    page: Joi.number().error(validationCommonErrHandler),
    limit: Joi.number().error(validationCommonErrHandler),
    createdFrom: Joi.date().label('Case Date From').error(validationCommonErrHandler),
    createdTo: Joi.date().label('Case Date To').error(validationCommonErrHandler),
    submittedFrom: Joi.date().label('Case Date From').error(validationCommonErrHandler),
    submittedTo: Joi.date().label('Case Date To').error(validationCommonErrHandler),
    timezone: Joi.string().label('Time Zone').error(validationCommonErrHandler)
}

const createOrEditItemsBodyValidation = {
    locationItemId: Joi.number().required().error(validationCommonErrHandler),
    quantity: Joi.number().required().error(validationCommonErrHandler),
    action: Joi.string().required().error(validationCommonErrHandler)
}

const createItemsParamValidation = {
    miscSaleId: Joi.number().required().error(validationCommonErrHandler)
}

const editItemsParamValidation = {
    miscSaleId: Joi.number().required().error(validationCommonErrHandler),
    miscSaleItemId: Joi.number().required().error(validationCommonErrHandler)
}

const categoriesValidation = {
    itemTypeId: Joi.number().required().error(validationCommonErrHandler)
}

const getMiscItemsRequestSchema = {
    locationId: Joi.number().required().error(validationCommonErrHandler),
    itemTypeId: Joi.number().when(
        'itemCategoryId',
        { is: Joi.exist(),
            then: Joi.number().error(validationCommonErrHandler),
            otherwise: Joi.number().required().error(validationCommonErrHandler)
        }),
    itemIndustryId: Joi.when(
        'itemCategoryId',
        { is: Joi.exist(),
            then: Joi.number().error(validationCommonErrHandler),
            otherwise: Joi.number().required().error(validationCommonErrHandler)
        }),
    itemCategoryId: Joi.number().error(validationCommonErrHandler),
    miscDecedentId: Joi.number().allow(false).error(validationCommonErrHandler),
    agreementId: Joi.number().error(validationCommonErrHandler),
    searchTerm: Joi.string().error(validationCommonErrHandler),
    attributes: Joi.object().error(validationCommonErrHandler),
    limit: Joi.number().error(validationCommonErrHandler),
    offset: Joi.number().error(validationCommonErrHandler),
    vendorId: Joi.number().error(validationCommonErrHandler)
}

module.exports = {
    createOrEditValidation,
    editRequestParamValidation,
    getListingValidation,
    createOrEditItemsBodyValidation,
    createItemsParamValidation,
    editItemsParamValidation,
    categoriesValidation,
    getMiscItemsRequestSchema
}
