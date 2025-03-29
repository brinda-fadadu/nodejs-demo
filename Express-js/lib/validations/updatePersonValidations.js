const Joi = require('@hapi/joi')
const { getMaritalStatuses, getLanguageIds, getOrganizationIds } = require('../../utils/dbGetFunctions')
const { addressValidation } = require('./commonValidations')

const SSN_REGX = /^(?!000|666)[0-8][0-9]{2}-(?!00)[0-9]{2}-(?!0000)[0-9]{4}$/

async function personUpdateValidation (req, res, next) {
    try {
        let langIds = await getLanguageIds()
        let orgIds = await getOrganizationIds()
        let maritalStatusIds = await getMaritalStatuses()
        let schema = {
            person: {
                prefix: Joi.string().allow('', null),
                licenseNumber: Joi.string().allow('', null),
                firstName: Joi.string(),
                middleName: Joi.string().allow('', null),
                lastName: Joi.string(),
                phoneNumber: Joi.string().allow('', null),
                secondaryPhoneNumber: Joi.string().allow('', null),
                email: Joi.string().allow('', null),
                maritalStatus: Joi.number().valid(maritalStatusIds),
                gender: Joi.number().allow('', null),
                languageId: Joi.number().valid(langIds),
                organizationId: Joi.number().valid(orgIds),
                isVerified: Joi.boolean().required(),
                dateOfBirth: Joi.date().allow(null),
                dateOfDeath: Joi.date().allow(null),
                aka: Joi.string().allow('', null),
                suffix: Joi.string().allow('', null),
                ssn: Joi.string().label('SSN').optional().regex(SSN_REGX).allow('', null),
                apiType: Joi.string().label('apiType').optional(),
                addressPlace: {
                    address: addressValidation()
                }
            }
        }
        if (Object.keys(req.body).length) {
            Joi.validate(req.body, schema, err => {
                if (err) {
                    res.status(422).json({
                        message: err.message
                    })
                } else {
                    next()
                }
            })
        } else {
            res.status(422).json({
                message: `Input required`
            })
        }
    } catch (error) {
        res.status(422).json({
            message: error.message
        })
    }
}

module.exports = {
    personUpdateValidation
}
