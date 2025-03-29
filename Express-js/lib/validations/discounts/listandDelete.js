const Joi = require('@hapi/joi')
exports.validateParams = async function (req, res, next) {
    const paramSchema = Joi.object().keys({
        discountId: Joi.number().greater(0).required().error(new Error('DiscountId must be a valid number and greater than 0'))
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
