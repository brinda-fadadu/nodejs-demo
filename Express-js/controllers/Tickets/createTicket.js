const models = require('../../models')

const commonFunctions = require('./commonFunctions')

exports.createTicket = async function (ticketData, userId) {
    try {
        ticketData = await commonFunctions.getTicketObject(ticketData)
        ticketData.Owner = ticketData.CreatedBy = userId
        ticketData.ticketHistory = {
            CreatedBy: userId,
            AssignedTo: ticketData.AssignedTo,
            DueDate: ticketData.DueDate,
            Status: 1,
            Description: ticketData.Description,
            Priority: ticketData.Priority
        }
        let result = await models.Ticket.create(ticketData, {
            include: [{
                model: models.TicketHistories,
                as: 'ticketHistory'
            }]
        })

        return result
    } catch (error) {
        throw error
    }
}
