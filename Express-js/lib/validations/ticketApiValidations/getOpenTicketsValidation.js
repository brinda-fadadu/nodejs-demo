const Joi = require('@hapi/joi')
const { getEmployees } = require('../../../utils/dbGetFunctions')
const { validationCommonErrHandler } = require('../commonValidations')
const seedData = require('../../../config/seed').seed
const logger = require('../../../lib/logger')

const validTicketPriorityOptions = () => Object.keys(seedData.TicketPriority)

async function validateOpenTickets (req, res, next) {
    const data = req.query
    const usersIds = await getEmployees()
    const validTicketPriority = validTicketPriorityOptions()
    const sortOrders = ['asc', 'desc']

    const schema = Joi.object().keys({
        timezone: Joi.string().required('Timezone is required').label('Timezone').error(validationCommonErrHandler),
        page: Joi.number().min(1).label('Page').error(validationCommonErrHandler),
        limit: Joi.number().required('Limit is required').min(5).label('Limit').error(validationCommonErrHandler),
        sortOrder: Joi.string().valid(sortOrders).label('Sort Order').error(validationCommonErrHandler),
        priority: Joi.string().valid(validTicketPriority).label('Priority').error(validationCommonErrHandler),
        ticketId: Joi.string().label('Ticket Number').error(validationCommonErrHandler),
        dueDateFrom: Joi.date().label('Due Date From').error(validationCommonErrHandler),
        dueDateTo: Joi.date().label('Due Date To').error(validationCommonErrHandler),
        status: Joi.array().items(Joi.number()).allow(null).label('Status').error(validationCommonErrHandler),
        callId: Joi.string().label('Call Id').error(validationCommonErrHandler),
        callerName: Joi.string().label('Caller Name').error(validationCommonErrHandler),
        callDateFrom: Joi.date().label('Call Date From').error(validationCommonErrHandler),
        callDateTo: Joi.date().label('Call Date To').error(validationCommonErrHandler),
        assignedTo: Joi.number().valid(usersIds).allow(0).label('Assigned To').error(validationCommonErrHandler),
        type: Joi.array().items(Joi.number()).allow(null).label('Type').error(validationCommonErrHandler)
    })

    Joi.validate(data, schema, (err, value) => {
        if (err) {
            logger.error(err)
            res.status(422).json({
                message: err.message
            })
        } else {
            next()
        }
    })
}

module.exports = exports = { validateOpenTickets }
