const Joi = require('@hapi/joi')
const {
    getEmployees,
    getStatusIds,
    getLanguageIds
} = require('../../../utils/dbGetFunctions')
const seedData = require('../../../config/seed').seed
const { getReasonSchema } = require('./reasons')
const { validationCommonErrHandler, personSchemaValidation, addressPlaceValidation, validateFunction } = require('../commonValidations')
const { customResponse } = require('../../custom-response')

async function createCallValidation (req, res, next) {
    try {
        let usersIds = await getEmployees()
        let languageIds = await getLanguageIds()
        let callTypes = Object.keys(seedData.Type).map(Number)
        let reasonTypes = Object.keys(seedData.CallReasons).map(Number)
        let callReceivedLocations = Object.keys(
            seedData.CallReceivedLocations
        ).map(Number)
        let callStatus = await getStatusIds()
        const statusIds = callStatus.map(e => { return e.id })

        const appointmentDateValidation = Joi.date()
            .label('Appointment Date')
            .error(validationCommonErrHandler)
        let schema = {
            type: Joi.number()
                .valid(callTypes)
                .label('Type')
                .required().error(validationCommonErrHandler),
            languageId: Joi.number().valid(languageIds).label('Language').error(validationCommonErrHandler),
            reasonId: Joi.number()
                .valid(reasonTypes)
                .label('Reason')
                .required().error(validationCommonErrHandler),
            receivedLocationId: Joi.number()
                .valid(callReceivedLocations)
                .label('Received Location')
                .required()
                .error(validationCommonErrHandler),
            status: Joi.number()
                .valid(statusIds)
                .label('Status')
                .required()
                .error(validationCommonErrHandler),
            assignedToId: Joi.array().items(usersIds).label('Assigned To').error(validationCommonErrHandler),
            appointmentDate: appointmentDateValidation,
            notes: Joi.array().items(Joi.object().keys({
                level: Joi.string().required().label('Level').error(validationCommonErrHandler),
                content: Joi.string().required().max(255).label('Content').error(validationCommonErrHandler)
            })),
            caller: {
                ...personSchemaValidation(),
                addressPlace: {
                    ...addressPlaceValidation()
                }
            },
            reasons: await getReasonSchema(
                req.body.reasonId
            ),
            // documents: Joi.array().items(Joi.string()).error(validationCommonErrHandler)
            documents: Joi.array().items(Joi.object().keys({
                id: Joi.number().allow(null).error(validationCommonErrHandler),
                url: Joi.string().required().label('Url').error(validationCommonErrHandler),
                folderName: Joi.string().required().label('foldername').error(validationCommonErrHandler),
                originalFileName: Joi.string().required().label('original file name').error(validationCommonErrHandler)
            })),
            locationCode: Joi.string().label('Location Code').required()
        }
        if (req.method !== 'PUT') {
            schema.appointmentDate = appointmentDateValidation.greater('now')
        }
        validateFunction(req.body, schema, next, (err) => {
            if (err) {
                customResponse(422, err, res)
            }
        })
    } catch (error) {
        console.log(error)
        next(error)
    }
}

function getCallValidation (req, res, next) {
    const paramsSchema = {
        callId: Joi.string().required().label('Call Id').error(validationCommonErrHandler)
    }
    validateFunction(req.params, paramsSchema, next, (err) => {
        if (err) {
            customResponse(422, err, res)
        }
    })
}
module.exports = {
    createCallValidation,
    getCallValidation
}
