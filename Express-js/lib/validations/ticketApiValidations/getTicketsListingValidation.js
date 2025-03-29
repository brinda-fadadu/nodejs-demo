const Joi = require('@hapi/joi')
const { getCallIds } = require('../../../utils/dbGetFunctions')
const seedData = require('../../../config/seed').seed

const ticketStatus = Object.keys(seedData.TicketStatus).map(Number)
const ticketPriority = Object.keys(seedData.TicketPriority).map(Number)

async function listTicketValidation (req, res, next) {
    try {
        let callIds = await getCallIds()
        let schema = {
            type: Joi.number()
                .valid([3, 5])
                .optional(), // 3 & 5 are numbers for Genealogy Search and Maintenance Request respectively
            page: Joi.number().required(),
            limit: Joi.number().required(),
            search: Joi.string(),
            sort: Joi.string()
                .valid('asc', 'desc')
                .optional(),
            priority: Joi.number().valid(ticketPriority),
            status: Joi.number().valid(ticketStatus),
            assignedTo: Joi.array(),
            callId: Joi.number().valid(callIds),
            locationIds: Joi.array().min(1)
        }
        Joi.validate(req.query, schema, err => {
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
    listTicketValidation
}
