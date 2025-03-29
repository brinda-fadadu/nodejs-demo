const Joi = require('@hapi/joi')
const { getCallReason } = require('../../../utils/dbGetFunctions')
const seedData = require('../../../config/seed').seed

const ticketStatus = Object.keys(seedData.TicketStatus).map(Number)
const ticketPriority = Object.keys(seedData.TicketPriority).map(Number)
const ticketMaintenanceTypes = Object.keys(seedData.MaintenanceTypes).map(Number)

async function createTicketValidation (req, res, next) {
    try {
        let schema = {
            ticket: {
                title: Joi.string().required(),
                description: Joi.string().required(),
                callId: Joi.number().required(),
                priority: Joi.number().valid(ticketPriority).required().error(new Error('Ticket Priority is required')),
                status: Joi.number().valid(ticketStatus).optional().error(new Error('Ticket Status is required')),
                dueDate: Joi.date().required(),
                assignedTo: Joi.number().optional(),
                documents: Joi.array().items(Joi.object().keys({
                    url: Joi.string().allow(null).label('Url').error(new Error('Url should be string or null')),
                    folderName: Joi.string().label('foldername').error(new Error('Folder name should be string')),
                    originalFileName: Joi.string().label('original file name').error(new Error('Originalfilename should be string'))
                }))
            }
        }

        let callReason = await getCallReason(req.body.ticket.callId)
        if (callReason === 3) {
            schema.ticket.maintenanceType = Joi.number().valid(ticketMaintenanceTypes).required()
        }

        if (Object.keys(req.body).length) {
            Joi.validate(req.body, schema, (err) => {
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
    createTicketValidation
}
