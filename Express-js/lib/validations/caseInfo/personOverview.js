const Joi = require('@hapi/joi')
const { validateFunction, validationCommonErrHandler, personSchemaValidation, certifierSchema, addressPlaceValidation, addressValidation, deathDetailsSchemaValidation, maidenNameValidation, regexForValidations } = require('../commonValidations')
const { customResponse } = require('../../custom-response')
const _ = require('lodash')
const seedValues = require('../../../config/seed').seed
const { getRelations } = require('../../../controllers/refactorControllers/utils')

function primaryDetails (req, res, next) {
    const reqBodySchema = {
        ...personSchemaValidation(false),
        maidenName: maidenNameValidation(seedValues.Gender[req.body.gender] === 'Femail'),
        birthPlace: {
            ...addressPlaceValidation()
        },
        personVerificationDetails: {
            ssn: Joi.string().label('SSN').optional().regex(regexForValidations.SSN).allow('', null).error(validationCommonErrHandler)
        }
    }
    if (req.method === 'PUT') {
        reqBodySchema.id = Joi.number().allow('', null).required().error(validationCommonErrHandler)
    }
    validateFunction(req.body, reqBodySchema, next, (err) => {
        if (err) {
            customResponse(422, err, res)
        }
    })
}

function residentialDetails (req, res, next) {
    const reqBodySchema = {
        id: Joi.number().allow('', null).label('id').error(validationCommonErrHandler),
        addressPlace: {
            id: Joi.number().error(validationCommonErrHandler),
            address: {
                ...addressValidation()
            }
        },
        personVerificationDetails: {
            yearsAtResidentialAddress: Joi.number().min(0).allow('', null).error(validationCommonErrHandler)
        }
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

function ethnicityDetails (req, res, next) {
    const reqBodySchema = {
        id: Joi.number().allow('', null).label('id').error(validationCommonErrHandler),
        isHispanic: Joi.boolean().allow(null, '').optional().error(validationCommonErrHandler),
        raceOneId: Joi.number().min(0).allow(null).optional().error(validationCommonErrHandler),
        raceTwoId: Joi.number().min(0).allow(null).optional().error(validationCommonErrHandler),
        hispanicId: Joi.number().min(0).allow(null).optional().error(validationCommonErrHandler),
        raceThreeId: Joi.number().min(0).allow(null).optional().error(validationCommonErrHandler),
        ethnicityOneId: Joi.number().min(0).allow(null).optional().error(validationCommonErrHandler),
        ethnicityTwoId: Joi.number().min(0).allow(null).optional().error(validationCommonErrHandler),
        ethnicityThreeId: Joi.number().min(0).allow(null).optional().error(validationCommonErrHandler)
    }
    validateFunction(req.body, reqBodySchema, next, (err) => {
        if (err) {
            customResponse(422, err, res)
        }
    })
}

function educationDetails (req, res, next) {
    const reqBodySchema = {
        id: Joi.number().allow('', null).label('id').error(validationCommonErrHandler),
        industry: Joi.string().allow('', null).optional().max(100).label('indistry').error(validationCommonErrHandler),
        occupation: Joi.string().allow('', null).optional().max(100).label('occupation').error(validationCommonErrHandler),
        qualificationId: Joi.number().min(0).allow(null).label('qualificationId').error(validationCommonErrHandler),
        yearsOfOccupation: Joi.number().min(0).allow(null).label('years of occupation').error(validationCommonErrHandler)
    }
    validateFunction(req.body, reqBodySchema, next, (err) => {
        if (err) {
            customResponse(422, err, res)
        }
    })
}

function veteranDetails (req, res, next) {
    const reqBodySchema = {
        id: Joi.number().allow('', null).label('id').error(validationCommonErrHandler),
        isUnknown: Joi.boolean().required().label('isUnknown').error(validationCommonErrHandler),
        isVeteran: Joi.string().allow(null).label('isVeteran').error(validationCommonErrHandler),
        serviceEra: Joi.string().allow('', null).optional().label('serviceEra').error(validationCommonErrHandler),
        serviceBranchId: Joi.number().min(0).allow(null).label('serviceBranchId').error(validationCommonErrHandler)
    }
    validateFunction(req.body, reqBodySchema, next, (err) => {
        if (err) {
            customResponse(422, err, res)
        }
    })
}

function deathDetails (req, res, next) {
    const reqBodySchema = {
        ...deathDetailsSchemaValidation({ checkDob: false })
    }
    validateFunction(req.body, reqBodySchema, next, (err) => {
        if (err) {
            customResponse(422, err, res)
        }
    })
}
function certifierDetails (req, res, next) {
    const reqBodySchema = { ...certifierSchema() }
    validateFunction(req.body, reqBodySchema, next, (err) => {
        if (err) {
            customResponse(422, err, res)
        }
    })
}

async function parentsValidation (req, res, next) {
    const relations = await getRelations('map')
    const parentsRelations = [relations['Mother'], relations['Father']]
    const relationValidation = Joi.number().error(validationCommonErrHandler).valid(parentsRelations)
    const reqBodySchema = {
        id: Joi.number().allow('', null).label('id').error(validationCommonErrHandler),
        relationId: relationValidation,
        person: {
            id: Joi.number().label('id').error(validationCommonErrHandler),
            ...personSchemaValidation(false),
            birthPlace: {
                id: Joi.number().error(validationCommonErrHandler),
                address: {
                    ...addressValidation()
                }
            }
        }
    }
    if (req.body.relationId === relations['Mother']) {
        reqBodySchema.person.maidenName = maidenNameValidation(false)
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

function contactsValidation (req, res, next) {
    const relationValidation = Joi.number().error(validationCommonErrHandler)
    if (!_.has(req.body, 'person.addressPlace.organization')) {
        relationValidation.required()
    } else {
        relationValidation.allow('', null)
    }
    const reqBodySchema = {
        id: Joi.number().allow('', null).label('id').error(validationCommonErrHandler),
        relationId: relationValidation,
        person: {
            id: Joi.number().allow('', null).label('id').error(validationCommonErrHandler),
            ...personSchemaValidation(false),
            addressPlace: {
                id: Joi.number().allow('', null).error(validationCommonErrHandler),
                ...addressPlaceValidation()
            }
        },
        addressPlace: {
            id: Joi.number().label('id').error(validationCommonErrHandler),
            address: {
                ...addressValidation()
            }
        }
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

function fetchFullSSNValidation (req, res, next) {
    const schema = {
        OPIids: Joi.array().required().label('OPI ids').error(validationCommonErrHandler)
    }
    Joi.validate(req.body, schema, (err, value) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

module.exports = {
    primaryDetails,
    residentialDetails,
    ethnicityDetails,
    educationDetails,
    veteranDetails,
    deathDetails,
    certifierDetails,
    parentsValidation,
    contactsValidation,
    fetchFullSSNValidation
}
