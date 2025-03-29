const Joi = require('@hapi/joi')

async function validateListCalls (req, res, next) {
    const data = req.query

    const schema = Joi.object().keys({
        page: Joi.string().allow('', null).optional().error(new Error('page is invalid')),
        limit: Joi.string().allow('', null).optional().error(new Error('limit is invalid')),
        opiOrName: Joi.string().allow('', null).optional().error(new Error('opiOrName is invalid'))
    })

    Joi.validate(data, schema, (err, value) => {
        if (err) {
            res.status(422).json({
                message: err
            })
        } else {
            next()
        }
    })
}

module.exports = exports = validateListCalls
