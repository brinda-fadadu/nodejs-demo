const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

async function validateManageProperties (req, res, next) {
    const paramsSchema = {
        agreementId: Joi.number().required().label('Statement Id').error(validationCommonErrHandler)
    }
    const bodySchema = {
        propertyId: Joi.number().required(),
        reservationStatus: Joi.string().valid('reserved', 'confirmed', 'released').required(),
        addendumId: Joi.number(),
        apiType: Joi.string().valid('quotation')
    }

    Joi.validate(req.params, paramsSchema, (err, value) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            Joi.validate(req.body, bodySchema, (err, value) => {
                if (err) {
                    res.status(422).json({
                        error: err.message
                    })
                } else {
                    next()
                }
            })
        }
    })
}

function validateAdditionalRights (req, res, next) {
    const paramsSchema = {
        action: Joi.string().required().label('Action').error(validationCommonErrHandler),
        agreementId: Joi.number().required().label('Agreement Id').error(validationCommonErrHandler),
        agreementPropertyId: Joi.number().required().label('Agreement Property Id').error(validationCommonErrHandler)
    }
    const bodySchema = {
        addendumId: Joi.number().label('Addendum Id').error(validationCommonErrHandler)
    }
    if (req.params.action === 'remove') {
        bodySchema.additionalRightId = Joi.number().required().label('Additional Right Id').error(validationCommonErrHandler)
    }
    paramAndBodyValidation(req, res, next)(paramsSchema, bodySchema)
}

function validateSideBySideProperty (req, res, next) {
    let bodySchema = {}
    const paramsSchema = {
        agreementId: Joi.number().required().label('Agreement Id').error(validationCommonErrHandler)
    }
    if (req.method !== 'DELETE') {
        bodySchema = {
            leftAgreementPropertyId: Joi.number().label('Left Agreement Property Id').error(validationCommonErrHandler),
            rightAgreementPropertyId: Joi.number().label('Right Agreement Property Id').error(validationCommonErrHandler)
        }
    }
    if (req.method === 'PUT' || req.method === 'DELETE') {
        paramsSchema.sideBySidePropertyId = Joi.number().required().label('Side By Side Property Id').error(validationCommonErrHandler)
    }
    paramAndBodyValidation(req, res, next)(paramsSchema, bodySchema)
}

function validateExtensionRequest (req, res, next) {
    const paramsSchema = {
        agreementId: Joi.number().required().label('Agreement Id').error(validationCommonErrHandler),
        agreementPropertyId: Joi.number().required().label('Agreement Property Id').error(validationCommonErrHandler)
    }
    const bodySchema = {
        extensionDate: Joi.date().label('Extension Date').error(validationCommonErrHandler),
        note: Joi.string().label('Notes').error(validationCommonErrHandler)
    }
    paramAndBodyValidation(req, res, next)(paramsSchema, bodySchema)
}

function paramAndBodyValidation (req, res, next) {
    return (paramsSchema, bodySchema) => {
        Joi.validate(req.params, paramsSchema, (err, value) => {
            if (err) {
                res.status(422).json({
                    error: err.message
                })
            } else {
                Joi.validate(req.body, bodySchema, (err, value) => {
                    if (err) {
                        res.status(422).json({
                            error: err.message
                        })
                    } else {
                        next()
                    }
                })
            }
        })
    }
}

function addOwnersToPropertiesValidation (req, res, next) {
    const paramsSchema = {
        agreementId: Joi.number().required().label('Agreement Id').error(validationCommonErrHandler),
        propertyId: Joi.number().required().label('Agreement Property Id').error(validationCommonErrHandler)
    }
    const bodySchema = {
        ownerId: Joi.number().required().label('Person Id').error(validationCommonErrHandler),
        addedInAddendumId: Joi.number().allow(null).label('Added in Addendum Id').error(validationCommonErrHandler)
    }
    paramAndBodyValidation(req, res, next)(paramsSchema, bodySchema)
}

function deletePropertyOwnerValidation (req, res, next) {
    const paramsSchema = {
        agreementId: Joi.number().required().label('Agreement Id').error(validationCommonErrHandler),
        propertyId: Joi.number().required().label('Agreement Property Id').error(validationCommonErrHandler),
        ownerId: Joi.number().required().label('Agreement Property Owner Id').error(validationCommonErrHandler)
    }
    const bodySchema = {
        deletedInAddendumId: Joi.number().allow(null).label('Deleted in Addendum Id').error(validationCommonErrHandler)
    }
    paramAndBodyValidation(req, res, next)(paramsSchema, bodySchema)
}

async function propertyOwnerValidation (req, res, next) {
    const models = require('../../../models')
    let record
    let addendumId = req.body.addedInAddendumId || req.body.deletedInAddendumId
    if (addendumId) {
        record = await models.HMISAddendumDataSync.findOne({
            where: { addendumId, statusId: { [models.Sequelize.Op.ne]: 4 } }
        })
    } else {
        record = await models.HMISDataSync.findOne({
            where: { agreementId: req.params.agreementId, statusId: { [models.Sequelize.Op.ne]: 4 } }
        })
    }
    if (record) {
        res.status(422).json({
            error: 'This contract/addendum is already submitted.'
        })
    } else {
        next()
    }
}
module.exports = {
    validateManageProperties,
    validateAdditionalRights,
    validateSideBySideProperty,
    validateExtensionRequest,
    addOwnersToPropertiesValidation,
    deletePropertyOwnerValidation,
    propertyOwnerValidation
}
