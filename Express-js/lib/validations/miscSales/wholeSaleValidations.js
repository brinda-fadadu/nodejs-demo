const Joi = require('@hapi/joi')
const { validationCommonErrHandler, personSchemaValidation, addressValidation, regexForValidations } = require('../commonValidations')

var createOrEditValidation = {
    partnerId: Joi.number().required().label('partnerId').error(validationCommonErrHandler),
    decedents: Joi.array().items(Joi.number()).min(1).error(validationCommonErrHandler)
}

var createDecedentValidation = {
    person: {
        ...personSchemaValidation(),
        dateOfDeath: Joi.date().allow('', null).label('Date of Death').less('now').error(validationCommonErrHandler),
        addressPlace: {
            address: {
                ...addressValidation()
            }
        },
        ssn: Joi.string().label('SSN').optional().regex(regexForValidations.SSN).allow('', null).error(validationCommonErrHandler)

    },
    referenceNumber: Joi.string().required().error(validationCommonErrHandler)
}

var editParamValidation = {
    wholeSaleId: Joi.number().required().error(validationCommonErrHandler)
}

var createOrEditItemsBodyValidation = {
    locationItemId: Joi.number().required().error(validationCommonErrHandler),
    quantity: Joi.number().required().error(validationCommonErrHandler),
    action: Joi.string().required().error(validationCommonErrHandler)
}

var createItemsParamValidation = {
    wholeSaleId: Joi.number().required().error(validationCommonErrHandler)
}

var editItemsParamValidation = {
    wholeSaleId: Joi.number().required().error(validationCommonErrHandler),
    wholeSaleItemId: Joi.number().required().error(validationCommonErrHandler)
}

var categoriesValidation = {
    itemTypeId: Joi.number().required().error(validationCommonErrHandler)
}

module.exports = {
    createOrEditValidation,
    createDecedentValidation,
    editParamValidation,
    createOrEditItemsBodyValidation,
    createItemsParamValidation,
    editItemsParamValidation,
    categoriesValidation
}
