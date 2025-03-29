const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')
const { validateFunction, validationResponse } = require('../validationFunctions')
let paramsSchema
let response

async function paramsValidation (req, res, next, schemaToValidate) {
    response = await validateFunction(req.params, paramsSchema)
    validationResponse(res, next, response)
}

exports.deleteTransferValidation = async function deleteTransferValidation (req, res, next) {
    paramsSchema = {
        personId: Joi.number().required().label('PersonId').error(validationCommonErrHandler),
        transferId: Joi.string().required().label('TransferId').error(validationCommonErrHandler)
    }
    paramsValidation(req, res, next, paramsSchema)
}
exports.listTransfersValidation = async function listTransfersValidation (req, res, next) {
    paramsSchema = {
        personId: Joi.number().required().label('PersonId').error(validationCommonErrHandler)
    }
    paramsValidation(req, res, next, paramsSchema)
}
