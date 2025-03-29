const models = require('../../models')

const createTicketHistory = async (TicketId, ticketHistoryData, t) => {
    try {
        const ticketData = await models.Ticket.findOne({ where: { TicketId }, transaction: t })
        ticketHistoryData.TicketId = ticketData.id
        await models.TicketHistories.create(ticketHistoryData, { transaction: t })
        return ticketData
    } catch (err) {
        throw err
    }
}

const updatingTicket = async (TicketId, ticketData, userId, t) => {
    try {
        ticketData = await getTicketObject(ticketData, userId)
        let result = await models.Ticket.update(ticketData, { where: { TicketId }, transaction: t })
        return result
    } catch (err) {
        throw err
    }
}

const getTicketObject = async (ticketData, userId) => {
    try {
        let ticketDataObj = {}
        for (let key in ticketData) {
            if (ticketData.hasOwnProperty(key)) {
                let fieldName = key[0].toUpperCase() + key.slice(1, key.length)
                ticketDataObj[fieldName] = ticketData[key]
            }
        }
        ticketDataObj.UpdatedBy = userId
        return ticketDataObj
    } catch (err) {
        throw err
    }
}

module.exports = {
    createTicketHistory,
    updatingTicket,
    getTicketObject
}
