const Joi = require('@hapi/joi')

async function advanceSearchValidations (req, res, next) {
    try {
        const schema = {
            matchCriteria: Joi.string().valid('all', 'some').required(),
            isVerified: Joi.boolean(),
            page: Joi.number().integer().min(1),
            limit: Joi.number().integer().min(1),
            fieldCriterias: Joi.array().min(1).required(),
            apiType: Joi.string()
        }
        if (Object.keys(req.body).length) {
            Joi.validate(req.body, schema, (err, value) => {
                if (err) {
                    res.status(422).json({
                        error: err.message
                    })
                } else {
                    next()
                }
            })
        } else {
            res.status(422).json({
                message: `Input required`
            })
        }
    } catch (err) {
        res.status(422).json({
            message: err.message
        })
    }
}

module.exports = advanceSearchValidations
