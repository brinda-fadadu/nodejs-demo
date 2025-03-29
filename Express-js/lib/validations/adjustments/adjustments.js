const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')
const seedValues = require('../../../config/seed')

exports.validateApplyAdjustment = (req, res, next) => {
    const data = req.body
    let bodySchemaKeys = {}
    const adjustmentTypes = seedValues.seed.AdjustmentType
    if (adjustmentTypes[data.adjustmentTypeId] === 'PromoDiscount') {
        bodySchemaKeys = {
            adjustmentTypeId: Joi.number().required().label('AdjustmentType Id').error(validationCommonErrHandler),
            code: Joi.string().required().label('Code').error(validationCommonErrHandler)
        }
    } else if (adjustmentTypes[data.adjustmentTypeId] === 'OtherDiscount') {
        bodySchemaKeys = {
            adjustmentTypeId: Joi.number().required().label('AdjustmentType Id').error(validationCommonErrHandler),
            adjustmentId: Joi.number().required().label('Adjustment Id').error(validationCommonErrHandler),
            amount: Joi.number().min(0).max(9999999999).label('Amount').error(new Error('Invalid amount value')),
            description: Joi.string().max(512).required().label('Description').error(validationCommonErrHandler),
            // documents: Joi.array().items(Joi.string()).required().label('Documents').error(validationCommonErrHandler)
            documents: Joi.array().items(Joi.object().keys({
                url: Joi.string().allow(null),
                folderName: Joi.string().required().error(new Error('Folder name required')),
                originalFileName: Joi.string().required().error(new Error('Original file name required'))
            }))
        }
    } else if (adjustmentTypes[data.adjustmentTypeId] === 'Adjustment') {
        bodySchemaKeys = {
            adjustmentTypeId: Joi.number().required().label('AdjustmentType Id').error(validationCommonErrHandler),
            adjustmentId: Joi.number().required().label('Adjustment Id').error(validationCommonErrHandler),
            amount: Joi.number().required().min(0).max(9999999999).label('Amount').error(new Error('Invalid amount value')),
            description: Joi.string().max(512).required().label('Description').error(validationCommonErrHandler),
            // documents: Joi.array().items(Joi.string()).required().label('Documents').error(validationCommonErrHandler),
            documents: Joi.array().items(Joi.object().keys({
                url: Joi.string().allow(null),
                folderName: Joi.string().required().error(new Error('Folder name required')),
                originalFileName: Joi.string().required().error(new Error('Original file name required'))
            })),
            impact: Joi.string().required().label('Impact').error(validationCommonErrHandler)
        }
    }

    bodySchemaKeys.addendumId = Joi.number().allow(null).label('Addendum Id').error(validationCommonErrHandler)
    bodySchemaKeys.apiType = Joi.string().valid('quotation')
    const bodySchema = Joi.object().keys(bodySchemaKeys)
    Joi.validate(req.body, bodySchema, (err, value) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

exports.validateRemoveAdjustment = (req, res, next) => {
    const paramSchema = Joi.object().keys({
        agreementId: Joi.number().required().label('Agreement id').error(validationCommonErrHandler),
        agreementAdjustmentId: Joi.number().required().label('AgreementAdjustmentId').error(validationCommonErrHandler)
    })
    Joi.validate(req.params, paramSchema, (err, value) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

exports.validateQueryParams = async function (req, res, next) {
    const querySchema = Joi.object().keys({
        adjustmentType: Joi.string().error(new Error('AdjustmentType must be string')),
        page: Joi.number().greater(0).error(new Error('Page value must not be less than 1')),
        limit: Joi.number().greater(0).error(new Error('Limit but must be a number and not allows less than 1'))
    })
    Joi.validate(req.query, querySchema, (err, result) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            next()
        }
    })
}

exports.validateParams = async function (req, res, next) {
    const paramSchema = Joi.object().keys({
        adjustmentId: Joi.number().required().error(new Error('DiscountId must be a valid number'))
    })
    Joi.validate(req.params, paramSchema, (err, value) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            next()
        }
    })
}

exports.createPromoCodeValidator = (req, res, next) => {
    const agreementTypes = Object.keys(seedValues.seed.ContractType).map(e => { return Number(e) })
    const adjustmentTypeIds = Object.keys(seedValues.seed.AdjustmentType).map(e => { return Number(e) })
    const agreementSectionIds = Object.keys(seedValues.seed.AgreementSection).map(e => { return Number(e) })
    const bodySchema = Joi.object().keys({
        code: Joi.string().required().max(20).label('Code').error(validationCommonErrHandler),
        title: Joi.string().required().max(40).label('Title').error(validationCommonErrHandler),
        description: Joi.string().optional().max(100).allow('', null).label('Description').error(validationCommonErrHandler),
        adjustmentTypeId: Joi.number().required().valid(adjustmentTypeIds).label('AdjustmentType').error(validationCommonErrHandler),
        agreementType: Joi.number().required().valid(agreementTypes).label('AgreementType').error(validationCommonErrHandler),
        discountUnit: Joi.string().required().valid(['%', '$']).label('DiscountUnit').error(validationCommonErrHandler),
        maxDiscountValue: Joi.number().greater(0).max(9999999999).required().label('Max Discount Value').error(validationCommonErrHandler),
        discountValue: Joi.number().greater(0).error(validationCommonErrHandler),
        startDate: Joi.date().required().label('StartDate').error(validationCommonErrHandler),
        endDate: Joi.date().required().min(Joi.ref('startDate')).label('EndDate').error(validationCommonErrHandler),
        isDisabled: Joi.boolean().required().invalid(true).label('isDisabled').error(validationCommonErrHandler),
        agreementSectionId: Joi.array().items(Joi.number().valid(agreementSectionIds)).optional().label('AgreementSection').error(validationCommonErrHandler)
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
}

exports.updatePromoCodeValidator = (req, res, next) => {
    const bodySchema = Joi.object().keys({
        title: Joi.string().required().max(40).label('Title').error(validationCommonErrHandler),
        description: Joi.string().optional().max(100).allow('', null).label('Description').error(validationCommonErrHandler),
        startDate: Joi.date().required().label('StartDate').error(validationCommonErrHandler),
        endDate: Joi.date().required().min(Joi.ref('startDate')).label('EndDate').error(validationCommonErrHandler),
        isDisabled: Joi.boolean().required().label('isDisabled').error(validationCommonErrHandler)
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
}

exports.validateIdInParams = (req, res, next) => {
    Joi.validate(req.params, Joi.object().keys({
        agreementId: Joi.number().required().error(new Error('AgreementId must be a number'))
    }), (err, value) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            next()
        }
    })
}
