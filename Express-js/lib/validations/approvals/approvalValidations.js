const Joi = require('@hapi/joi')
const { validationCommonErrHandler } = require('../commonValidations')
function acceptOrRejectValidation (req, res, next) {
    const listOfStatus = [
        'Declined',
        'Approved'
    ]
    const bodySchema = {
        status: Joi.string().valid(listOfStatus).label('Status').required().error(validationCommonErrHandler),
        resourceType: Joi.string().label('Resource Type').error(validationCommonErrHandler),
        actionNotes: Joi.string().label(`Reason for ${req.body.status === 'Declined' ? 'Decline' : 'Approval'}`).error(validationCommonErrHandler)
    }
    const paramsSchema = {
        approvalId: Joi.number().required().label('Approval Id').error(validationCommonErrHandler)
    }
    Joi.validate(req.params, paramsSchema, (err) => {
        if (err) {
            res.status(422).json({
                error: err.message
            })
        } else {
            Joi.validate(req.body, bodySchema, (err) => {
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
}
module.exports = {
    acceptOrRejectValidation
}
