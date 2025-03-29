
const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

async function caCheckRequestValidation (req, res, next) {
    let caCheckRequest = {
        requestedBy: Joi.string().label('requestedBy').error(validationCommonErrHandler),
        status: Joi.string().valid(['All', 'toBeProcessed', 'processed', 'voided']).label('status').error(validationCommonErrHandler),
        requestedDateFrom: Joi.string().label('requestedDateFrom').error(validationCommonErrHandler),
        requestedDateTo: Joi.string().label('requestedDateTo').error(validationCommonErrHandler),
        searchTerm: Joi.string().label('onePortalId').error(validationCommonErrHandler),
        page: Joi.number().required().label('Page').error(validationCommonErrHandler),
        limit: Joi.number().required().label('limit').error(validationCommonErrHandler),
        processedDateFrom: Joi.string().label('processedDateFrom').error(validationCommonErrHandler),
        processedDateTo: Joi.string().label('processedDateTo').error(validationCommonErrHandler)
    }

    Joi.validate(req.query, caCheckRequest, (err, value) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            next()
        }
    })
}

async function updateStatusValidation (req, res, next) {
    let obj = {
        status: Joi.string().required().valid(['processed', 'voided']).label('status').error(validationCommonErrHandler),
        cashAdvancedCheckRequestId: Joi.number().required().label('cashAdvancedCheckRequestId').error(validationCommonErrHandler),
        updatedTime: Joi.string().required().label('updatedTime').error(validationCommonErrHandler)
    }
    if (req.body && req.body.status === 'processed') {
        obj.vendorId = Joi.string().required().label('Vendor Id').error(validationCommonErrHandler)
        obj.vendorPrice = Joi.number().min(1).required().label('Vendor Price').error(validationCommonErrHandler)
    }
    Joi.validate(req.body, obj, (err, value) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            next()
        }
    })
}

async function addCAVendorValidation (req, res, next) {
    let obj = {
        name: Joi.string().max(40).required().label('name').error(validationCommonErrHandler),
        code: Joi.string().max(10).required().label('code').error(validationCommonErrHandler)
    }
    Joi.validate(req.body, obj, (err, value) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            next()
        }
    })
}

async function getCAVendorValidation (req, res, next) {
    let obj = {
        searchTerm: Joi.string().required().label('searchTerm').error(validationCommonErrHandler)
    }
    Joi.validate(req.query, obj, (err, value) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            next()
        }
    })
}

module.exports = {
    caCheckRequestValidation,
    updateStatusValidation,
    addCAVendorValidation,
    getCAVendorValidation
}
