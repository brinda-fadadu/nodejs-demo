const Joi = require('@hapi/joi')
const { validateFunction, validationCommonErrHandler, personSchemaValidation, addressPlaceValidation } = require('../commonValidations')
const { customResponse } = require('../../custom-response')
const seedValues = require('../../../config/seed').seed
const { getContactRoles } = require('../../../controllers/refactorControllers/utils')

async function createOrEditContactValidation (req, res, next) {
    const roles = await getContactRoles(req.body.contactType, [], 'role')
    const contactRoles = await getContactRoles(req.body.contactType, [], 'contactRoleNames')
    const contactTypes = Object.keys(seedValues.ContactType).map(Number)
    const reqBodySchema = {
        contactType: Joi.number().required().valid(contactTypes).error(validationCommonErrHandler),
        relationId: Joi.when('contactType', {
            is: 1,
            then: Joi.number().required().error(validationCommonErrHandler)
        }),
        contactRoleIds: Joi.array().required().items(Joi.number().label('contact roles').valid(roles).required()).error(new Error(`contactRoleIds must be from ${contactRoles.join(',')}`)),
        person: {
            ...personSchemaValidation(false),
            maidenName: Joi.string().allow('', null).label('Maiden Name').error(validationCommonErrHandler),
            addressPlace: {
                ...addressPlaceValidation()
            }
        }
    }
    if (req.body.contactType === 2) {
        reqBodySchema.resourceId = Joi.number().error(validationCommonErrHandler).required()
    }
    if (req.method === 'PUT') {
        reqBodySchema.id = Joi.number().allow('', null).error(validationCommonErrHandler)
    }
    validateFunction(req.body, reqBodySchema, next, (err) => {
        if (err) {
            customResponse(422, err, res)
        }
    })
}

module.exports = {
    createOrEditContactValidation
}
