const Joi = require('@hapi/joi')
const { getTicketIds } = require('../../../utils/dbGetFunctions')

async function ticketIdValidation (req, res, next) {
    try {
        let ticketIds = await getTicketIds()
        let schema = {
            id: Joi.string().valid(ticketIds).required()
        }
        Joi.validate(req.params, schema, (err) => {
            if (err) {
                res.status(422).json({
                    message: err.message
                })
            } else {
                next()
            }
        })
    } catch (error) {
        res.status(422).json({
            message: error.message
        })
    }
}

module.exports = {
    ticketIdValidation
}
