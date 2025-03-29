const Joi = require('@hapi/joi')
const { getRelationIds } = require('../../utils/dbGetFunctions')
const { sendErrorResponse } = require('../errorResponse')

function getDefaultErr (label) {
    switch (label) {
    case 'Marital Status':
    case 'Gender':
    case 'ContractType':
        return `${label} must be a number`
    case 'StartDate':
    case 'Date of Birth':
    case 'EndDate':
        return `${label} must be a date`
    case 'Prefix':
    case 'Suffix':
    case 'First Name':
    case 'Middle Name':
    case 'Last Name':
    case 'Maiden Name':
    case 'Phone Number':
    case 'Secondary Phone Number':
    case 'Email':
    case 'SSN':
        return `Invalid ${label}`
    case 'AKA':
    case 'Code':
    case 'Title':
    case 'DiscountUnit':
    case 'Description':
        return `${label} must be a string`
    case 'ApplicableCategories':
        return `${label} must be array of strings`
    case 'ApprovalRequiredFrom':
        return `${label} must be array of numbers`
    case 'IsActive':
        return `${label} must be a boolean`
    default:
        return `Enter valid ${label}`
    }
}

function validationCommonErrHandler (errors) {
    return errors.map(err => {
        switch (err.type) {
        case 'any.empty':
        case 'any.required':
            return new Error(`${err.context.label} is required`)
        case 'string.regex.base':
            return new Error(`Please enter valid ${err.context.label}`)
        case 'email.base':
            return new Error(`${err.context.label} should be in email format`)
        case 'string.email':
            return new Error('Enter a valid Email')
        case 'string.base':
            return new Error(`${err.context.label} must be a string`)
        case 'array.base':
            return new Error(`${err.context.label} must be an array`)
        case 'boolean.base':
            return new Error(`${err.context.label} must be a boolean`)
        case 'string.max':
            return new Error(`${err.context.label} must be of max length ${err.context.limit}`)
        case 'number.max':
            return new Error(`${err.context.label} must be of max length ${err.context.limit}`)
        case 'number.base':
            return new Error(`${err.context.label} must be a integer`)
        case 'number.greater':
            return new Error(`${err.context.label} must be greater than ${err.context.limit}`)
        case 'any.allowOnly':
            return new Error(
                `Enter valid ${err.context.label} from [${err.context.valids}]`
            )
        case 'date.base':
            return new Error(`${err.context.label} must be a date`)
        case 'date.less':
        case 'date.max':
            return new Error(`${err.context.label} must be less than today`)
        case 'date.min':
        case 'date.greater':
            return new Error(`${err.context.label} must be more than ${err.context.label === 'EndDate' ? 'Start Date' : 'today'}`)
        case 'any.invalid':
            return new Error(`${err.context.label} must be ${!err.context.value}`)
        case 'array.includesOne':
            return err.context.reason[0].context.valids ? new Error(`${err.context.label} must be from ${err.context.reason[0].context.valids}`) : new Error(`Enter valid values for ${err.context.label}`)
        default:
            const error = getDefaultErr(err.context.label)
            return new Error(error)
        }
    })
}

function stringNameValidations (
    regex,
    isRequired
) {
    let schema
    if (isRequired) {
        schema = Joi.string()
            .required()
            .regex(regex)
    } else {
        schema = Joi.string()
            .optional()
            .regex(regex)
            .allow('', null)
    }
    return schema
}

function emailStringValidations (
    isRequired
) {
    let schema
    if (isRequired) {
        schema = Joi.string()
            .email()
            .required().regex(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/).error(validationCommonErrHandler)
    } else {
        schema = Joi.string()
            .email()
            .optional()
            .regex(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/)
            .allow('', null).error(validationCommonErrHandler)
    }
    return schema
}

function seedValidations (validValues, isRequired) {
    if (!isRequired) {
        return Joi.number().valid(validValues)
    }
    return Joi.number()
        .valid(validValues)
        .required()
}
function certifierSchema () {
    const reqBodySchema = {
        id: Joi.number().allow('', null).label('id').error(validationCommonErrHandler),
        certifier: {
            id: Joi.number().allow('', null).label('id').error(validationCommonErrHandler),
            certifierPerson: {
                ...personSchemaValidation(false),
                id: Joi.number().allow('', null).error(validationCommonErrHandler),
                addressPlace: {
                    id: Joi.number().allow('', null).error(validationCommonErrHandler),
                    address: {
                        ...addressValidation()
                    }
                }
            },
            licenseNumber: Joi.string().label('licenseNumber').allow('', null).error(validationCommonErrHandler),
            faxNumber: Joi.string().required().label('faxNumber').error(validationCommonErrHandler)
        }
    }
    return reqBodySchema
}
function addressValidation () {
    const schema = {
        id: Joi.number().allow('', null).error(validationCommonErrHandler),
        line1: Joi.string().allow('', null).error(validationCommonErrHandler),
        line2: Joi.string().allow('', null).error(validationCommonErrHandler),
        apt: Joi.string().allow('', null).error(validationCommonErrHandler),
        city: Joi.string().allow('', null).regex(/^[(a-zA-Z\u00D8-\u00f6.-\s)]*/).error(validationCommonErrHandler),
        state: Joi.string().allow('', null).regex(/^[(a-zA-Z\u00D8-\u00f6.-\s)]*/).error(validationCommonErrHandler),
        country: Joi.string().allow('', null).regex(/^[(a-zA-Z\u00D8-\u00f6.-\s)]*/).error(validationCommonErrHandler),
        county: Joi.string().allow('', null).regex(/^[(a-zA-Z\u00D8-\u00f6.-\s)]*/).error(validationCommonErrHandler),
        zipcode: Joi.string().allow('', null).regex(/^[a-zA-Z0-9\s]+$/).max(10).error(validationCommonErrHandler)
    }
    return schema
}

function pathParameterValidation (req, res, next) {
    try {
        const schema = {}
        for (let key in req.params) {
            schema[key] = Joi.number().required().label(key).error(new Error(`${key} must be a number`))
        }
        Joi.validate(req.params, schema, { abortEarly: false }, (err) => {
            if (err) {
                res.status(422).json({
                    error: err.message
                })
            } else {
                next()
            }
        })
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

function addressPlaceValidation () {
    let isPhoneNoNotReq = stringNameValidations(/^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/, false)
    let isNameNotReq = stringNameValidations(/^[a-zA-Z ]*$/, false)

    return {
        id: Joi.number().allow('', null).label('id').error(validationCommonErrHandler),
        organizationId: Joi.number().label('organizationId').error(validationCommonErrHandler),
        addressId: Joi.number().label('addressId').error(validationCommonErrHandler),
        address: addressValidation(),
        organization: {
            id: Joi.number().allow('', null).label('id').error(validationCommonErrHandler),
            name: Joi.string().label('Name').error(validationCommonErrHandler),
            organizationTypeId: Joi.number().label('Orgainzation Type').error(validationCommonErrHandler),
            phoneNumber: isPhoneNoNotReq.label('Phone Number').error(validationCommonErrHandler),
            licenseNumber: isNameNotReq.label('LicenseNumber').error(validationCommonErrHandler)
        }
    }
}

function familyArrangerValidation () {
    let isNameNotReq = stringNameValidations(/^[a-zA-Z-'.\s\u00C0-\u017F]*$/, false)
    return {
        firstName: isNameNotReq.label('First Name').error(validationCommonErrHandler),
        lastName: isNameNotReq.label('Last Name').error(validationCommonErrHandler),
        email: Joi.string().email().allow('', null).label('Email').error(validationCommonErrHandler),
        secondaryEmail: Joi.string().email().allow('', null).label('Secondary Email').error(validationCommonErrHandler)
    }
}
/**
 * This function returns a person validate schema object.
 * @param {Boolean} phoneNoReq - boolean to define if Phone Number to be required or not
 */

function personSchemaValidation (phoneNoReq) {
    let isNameReq = stringNameValidations(/^[a-zA-Z-'.\s\u00C0-\u017F]*$/, true)
    let isNameNotReq = stringNameValidations(/^[a-zA-Z-'.\s\u00C0-\u017F]*$/, false)

    let prefixValidation = stringNameValidations(/^[a-zA-Z.]*$/, false)

    let isPhoneNoReq = stringNameValidations(/^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/, true)
    let isPhoneNoNotReq = stringNameValidations(/^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/, false)
    return {
        id: Joi.number().allow('', null).label('Id').error(validationCommonErrHandler),
        title: isNameNotReq.label('Title').error(validationCommonErrHandler),
        prefix: prefixValidation.label('Prefix').error(validationCommonErrHandler),
        suffix: isNameNotReq.label('Suffix').error(validationCommonErrHandler),
        firstName: isNameReq.label('First Name').error(validationCommonErrHandler),
        middleName: isNameNotReq.label('Middle Name').error(validationCommonErrHandler),
        lastName: isNameNotReq.label('Last Name').error(validationCommonErrHandler),
        phoneNumber: phoneNoReq ? isPhoneNoReq.label('Phone Number').error(validationCommonErrHandler) : isPhoneNoNotReq.label('Phone Number').error(validationCommonErrHandler),
        email: Joi.string().regex(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/).allow('', null).label('Email').error(validationCommonErrHandler),
        dateOfBirth: Joi.date()
            .label('Date of Birth')
            .less('now')
            .allow('', null)
            .error(validationCommonErrHandler),
        aka: isNameNotReq.label('AKA').error(validationCommonErrHandler),
        secondaryPhoneNumber: isPhoneNoNotReq.label('Secondary Phone Number').error(validationCommonErrHandler),
        gender: Joi.number().allow('', null).label('Gender').error(validationCommonErrHandler),
        isAlive: Joi.boolean().label('isAlive').error(validationCommonErrHandler),
        isVerified: Joi.boolean().label('isVerified').error(validationCommonErrHandler),
        createdAtApp: Joi.boolean().label('createdAtApp').error(validationCommonErrHandler),
        birthPlaceId: Joi.number().allow('', null).label('birthPlaceId').error(validationCommonErrHandler),
        addressPlaceId: Joi.number().allow('', null).label('addressPlaceId').error(validationCommonErrHandler),
        maritalStatusId: Joi.number().allow('', null).label('maritalStatusId').error(validationCommonErrHandler),
        preferredFirstName: isNameNotReq.label('Preferred First Name').error(validationCommonErrHandler),
        preferredMiddleName: isNameNotReq.label('Preferred Middle Name').error(validationCommonErrHandler),
        preferredLastName: isNameNotReq.label('Preferred Last Name').error(validationCommonErrHandler)
    }
}

function deathDetailsSchemaValidation ({ checkDob }) {
    const dateOfDeath = Joi.date().allow('', null).label('Date of Death').less('now').error(validationCommonErrHandler)
    if (checkDob) {
        dateOfDeath.greater(Joi.ref('...dateOfBirth'))
    }
    return {
        id: Joi.number().label('id').error(validationCommonErrHandler),
        dateOfDeath,
        deathPlace: addressPlaceValidation(),
        hospitalDeathStatus: Joi.string().allow('', null).label('Hospital Death Status').error(validationCommonErrHandler),
        lorSameAsPlaceOfDeath: Joi.boolean().label('Lor same as place of death').error(validationCommonErrHandler),
        lor: addressPlaceValidation(),
        isLORSameAsCallerAddress: Joi.boolean().label('Lor same as caller address').error(validationCommonErrHandler),
        placeOfDeath: Joi.string().allow('', null).label('place Of Death').error(validationCommonErrHandler)
    }
}
function deathDetailsWithCertifierSchemaValidation (checkDob) {
    const certifierId = Joi.number().allow(null).label('certifierId').error(validationCommonErrHandler)
    return {
        ...deathDetailsSchemaValidation(checkDob),
        certifierId: certifierId,
        ...certifierSchema()
    }
}

function maidenNameValidation (required) {
    return stringNameValidations(/^[a-zA-Z-'.\s\u00C0-\u017F]*$/, required)
}

async function relationSchema () {
    const relationIds = await getRelationIds()
    return {
        id: Joi.number().label('relationId').valid(relationIds).error(validationCommonErrHandler),
        name: Joi.string().label('Relation Name').error(validationCommonErrHandler)
    }
}

function validateFunction (data, schema, next, callback) {
    Joi.validate(data, schema, { abortEarly: false }, (err, value) => {
        if (err) {
            return callback(err)
        } else {
            next()
        }
    })
}

const regexForValidations = {
    SSN: /^(?!000|666)[0-8][0-9]{2}-(?!00)[0-9]{2}-(?!0000)[0-9]{4}$/
}

module.exports = {
    validationCommonErrHandler,
    stringNameValidations,
    emailStringValidations,
    seedValidations,
    addressValidation,
    pathParameterValidation,
    familyArrangerValidation,
    personSchemaValidation,
    deathDetailsSchemaValidation,
    deathDetailsWithCertifierSchemaValidation,
    relationSchema,
    validateFunction,
    addressPlaceValidation,
    maidenNameValidation,
    regexForValidations,
    certifierSchema
}
