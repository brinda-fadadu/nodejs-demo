const Joi = require('@hapi/joi')

function bulkDeleteCalls (req, res, next) {
    const data = req.body
    let deleteCallIdObject = Joi.object().keys({
        callId: Joi.string().required(),
        reasonId: Joi.number().required()
    })
    let deleteCallIdObjects = Joi.array().items(deleteCallIdObject)
    Joi.validate(data, deleteCallIdObjects, (err, value) => {
        if (err) {
            res.status(422).json({
                message: 'Invalid request data'
            })
        } else {
            next()
        }
    })
}

module.exports = exports = bulkDeleteCalls
