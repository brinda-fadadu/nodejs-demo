const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')

async function validateReqBody (req, res, next) {
    try {
        const paramsSchema = {
            statementId: Joi.number().required().label('Statement Id').error(validationCommonErrHandler),
            action: Joi.string().required().only('add', 'remove').label('Action').error(validationCommonErrHandler)
        }
        const reqBodySchema = {
            locationItemId: Joi.number().required().label('LocationItemId').error(validationCommonErrHandler),
            locationId: Joi.number().required().label('LocationId').error(validationCommonErrHandler)
        }
        Joi.validate(req.params, paramsSchema, (err, value) => {
            if (err) {
                res.status(422).json({
                    error: err.message
                })
            } else {
                Joi.validate(req.body, reqBodySchema, (err, value) => {
                    if (err) {
                        res.status(422).json({
                            error: err.message
                        })
                    } else {
                        next()
                    }
                })
            }
        })
    } catch (err) {
        console.log(err)
        res.status(500).send(err)
    }
}
module.exports = {
    validateReqBody
}
