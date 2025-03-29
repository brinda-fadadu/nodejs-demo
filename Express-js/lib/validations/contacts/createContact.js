const Joi = require('@hapi/joi')
const { getRelationIds, getCaseRoleIdsOnContactType, getEmployees } = require('../../../utils/dbGetFunctions')
const { validationCommonErrHandler } = require('../commonValidations')
const { getroles } = require('../../../config/seed')
const seedValues = require('../../../config/seed')
const { addressValidation } = require('../commonValidations')

async function createContact (req, res, next) {
    try {
        let bodySchema
        const contactTypes = seedValues.seed.ContactType
        const paramsSchema = {
            personId: Joi.number().required().label('PersonId').error(validationCommonErrHandler)
        }
        if (req.method === 'PUT') {
            paramsSchema.contactId = Joi.number().required().label('ContactId').error(validationCommonErrHandler)
        }
        const queryParamsSchema = Joi.object().keys(paramsSchema)
        let schema = {
            contactType: Joi.number().required().valid([1, 2, 3]).error(new Error('contactType must be one of [Family, CL Staff, Other]'))
        }
        const relationsIds = await getRelationIds()
        const caseRoleIds = await getCaseRoleIdsOnContactType(req.body.contactType)
        let roles = await getroles()
        roles = roles['Contact']
        await Joi.validate(req.params, queryParamsSchema, async (err, value) => {
            if (err) {
                res.status(422).json({
                    error: err.message
                })
            } else if (req.body.contactType) {
                switch (req.body.contactType) {
                case 1:
                case 3:
                    schema.prefix = Joi.string().regex(/^[a-zA-Z.]*$/).allow('', null).error(new Error('Prefix is not allows numbers'))
                    schema.firstName = Joi.string().required().regex(/^[a-zA-Z ]*$/).error(new Error('First name is mandatory and not allows numbers'))
                    schema.middleName = Joi.string().regex(/^[a-zA-Z ]*$/).allow('', null).error(new Error('Middle name is not allows number'))
                    schema.lastName = Joi.string().regex(/^[a-zA-Z ]*$/).allow('', null).error(new Error('Last name not allows number'))
                    schema.phoneNumber = Joi.string().regex(/^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/).error(new Error('Phone number is invalid'))
                    schema.secondaryPhoneNumber = Joi.string().regex(/^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/).allow('', null).label('Secondary Phone Number').error(validationCommonErrHandler)
                    schema.email = Joi.string().email().allow('', null)
                    schema.caseRoleIds = Joi.array().items(Joi.number().valid(caseRoleIds)).required().error(new Error('CaseRole is Invalid'))
                    schema.birthCountry = Joi.string().allow('', null).error(new Error('Birth country must be a string'))
                    schema.birthState = Joi.string().allow('', null).error(new Error('Birth State must be a string'))
                    schema.maidenName = Joi.string().regex(/^[a-zA-Z ]*$/).allow(null, '').error(new Error('Maiden name not allows numbers'))
                    if (req.body.caseRoleIds && req.body.caseRoleIds.indexOf(roles['Email Recipient']) > -1) {
                        schema.email = Joi.string().required().email().error(new Error('Email id is required for Email recipient'))
                    }
                    if (contactTypes[req.body.contactType] === 'Family') {
                        schema.relationId = Joi.number().valid(relationsIds).required().error(new Error('RelationId is required / not valid'))
                    }
                    schema.address = await addressValidation()
                    break
                case 2:
                    let empIds = await getEmployees()
                    schema.staffId = Joi.number().required().valid(empIds)
                    schema.roleIds = Joi.array().items(Joi.number().required().valid(caseRoleIds)).error(new Error('roleId must be one of [Pallbearers, Honorary Pallbearers]'))
                    break
                default:
                    break
                }
            }
            bodySchema = Joi.object().keys(schema)
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
    } catch (error) {
        res.status(404).json({
            error: error
        })
    }
}

module.exports = exports = createContact
