const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

exports.validatecreateCAI = (req, res, next) => {
    Joi.validate(req.body, Joi.object().keys({
        id: Joi.number().label('Quantity').error(new Error('Quantity must be number and minimum value is 1')),
        quantity: Joi.number().min(1).max(999999999).required().label('Quantity').error(new Error(`Quantity must be number and ${req.body.quantity == 0 ? 'minimum value is 1' : 'maximum value is 999999999'}`)),
        price: Joi.number().min(0).required().label('Price').error(new Error('Price must be number and minimum value is 0')),
        note: Joi.string().required().label('Note').error(validationCommonErrHandler),
        locationItemId: Joi.number().required().label('Location item id').error(validationCommonErrHandler),
        addendumId: Joi.number().label('AddendumId').error(validationCommonErrHandler),
        timezone: Joi.string().label('timezone').error(validationCommonErrHandler)
    }), (err, value) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

exports.validateRemoveCAI = (req, res, next) => {
    let data = {
        ...req.params,
        ...req.body
    }
    Joi.validate(data, Joi.object().keys({
        apiType: Joi.string().valid('quotation'),
        agreementId: Joi.number().required().label('Statement id').error(validationCommonErrHandler),
        agreementCashAdvancedItemId: Joi.number().required().label('Statementlocationcashadvanceitemid').error(validationCommonErrHandler),
        timezone: Joi.string().label('timezone').error(validationCommonErrHandler),
        addendumId: Joi.number().label('AddendumId').error(validationCommonErrHandler)
    }), (err, value) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

exports.validateCashAdvanceItemsChequeRequest = (req, res, next) => {
    let data = {
        ...req.params,
        ...req.body
    }
    Joi.validate(data, Joi.object().keys({
        agreementId: Joi.number().required().error(validationCommonErrHandler),
        agreementCashAdvancedItemIds: Joi.array().items(Joi.number()).required().error(validationCommonErrHandler),
        addendumId: Joi.number().error(validationCommonErrHandler)
    }), (err, value) => {
        if (err) {
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}
