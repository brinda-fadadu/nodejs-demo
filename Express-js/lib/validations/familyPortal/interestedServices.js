const Joi = require('@hapi/joi')

function interestedService (req, res, next) {
    const schema = Joi.object().keys({
        decedentId: Joi.number().required()
    })

    Joi.validate(req.params, schema, async (err, value) => {
        if (err) {
            res.status(422).json({
                error: err
            })
        } else {
            let schema = Joi.object().keys({
                faaId: Joi.number().required(),
                name: Joi.string().required(),
                description: Joi.string().required(),
                note: Joi.string().allow('', null)
            })

            Joi.validate(req.body, schema, (err, value) => {
                if (err) {
                    res.status(422).json({
                        message: err.message
                    })
                } else {
                    next()
                }
            })
        }
    })
}

module.exports = exports = interestedService
