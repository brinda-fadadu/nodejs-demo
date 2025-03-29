const Joi = require('@hapi/joi')

async function personIdValidation (req, res, next) {
    try {
        let schema = {
            personId: Joi.number().required()
        }
        if (Object.keys(req.params).length) {
            Joi.validate(req.params, schema, err => {
                if (err) {
                    res.status(422).json({
                        message: err.message
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
    } catch (error) {
        res.status(422).json({
            message: error.message
        })
    }
}

module.exports = {
    personIdValidation
}
