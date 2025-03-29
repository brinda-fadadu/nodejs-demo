const Joi = require('@hapi/joi')

async function simpleSearchValidations (req, res, next) {
    const paramsSchema = {
        q: Joi.string().required().error(new Error('q is required')),
        isVerified: Joi.boolean(),
        page: Joi.number(),
        limit: Joi.number(),
        isOpi: Joi.boolean(),
        apiType: Joi.string()
    }
    const queryParamsSchema = Joi.object().keys(paramsSchema)
    Joi.validate(req.query, queryParamsSchema, (err, value) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            next()
        }
    })
}

module.exports = simpleSearchValidations
