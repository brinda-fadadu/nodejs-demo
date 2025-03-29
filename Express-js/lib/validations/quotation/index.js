const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

async function validateCreateOrUpdate (req, res, next) {
    const bodySchema = {
        cemeteryAgreementId: Joi.number().allow(null).label('cemeteryAgreementId').error(validationCommonErrHandler),
        funeralAgreementId: Joi.number().allow(null).label('funeralAgreementId').error(validationCommonErrHandler),
        id: Joi.number().label('id').allow(null).error(validationCommonErrHandler),
        personId: Joi.number().allow(null).label('personId').error(validationCommonErrHandler)
    }
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

async function validateList (req, res, next) {
    const schema = {
        limit: Joi.number().min(1).label('Limit').error(validationCommonErrHandler),
        page: Joi.number().min(1).label('Page').error(validationCommonErrHandler)
    }

    Joi.validate(req.query, schema, (err, value) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            next()
        }
    })
}

async function validateShareQuotation (req, res, next) {
    let data = {
        ...req.params, ...req.body
    }
    const schema = {
        quotationId: Joi.number().required().label('quotationId').error(validationCommonErrHandler),
        timezone: Joi.string().required(),
        envelopeName: Joi.string().required(),
        emailSubject: Joi.string().required(),
        emailMessage: Joi.string().required(),
        brandId: Joi.number().required()
    }

    Joi.validate(data, schema, (err, value) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            next()
        }
    })
}
async function validateConvertToCase (req, res, next) {
    let data = {
        ...req.params, ...req.body
    }
    const schema = {
        quotationId: Joi.number().required().label('quotationId').error(validationCommonErrHandler)
    }
    Joi.validate(data, schema, (err, value) => {
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
    validateCreateOrUpdate,
    validateList,
    validateShareQuotation,
    validateConvertToCase
}
