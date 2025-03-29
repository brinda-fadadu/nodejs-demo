const models = require('../../models')
const moment = require('moment')
const commonFunctions = require('./commonFunctions')

exports.archiveTicket = async function (ticketIdsToDelete, userId) {
    try {
        let deletedCount = 0
        const notFoundTickets = []
        const deletedTickets = []
        for (const x of ticketIdsToDelete) {
            await models.sequelize.transaction(async (t) => {
                // step 1
                const result = await commonFunctions.updatingTicket(x.ticketId, { archived: true }, userId, t)
                // step 2
                if (result[0] === 1) {
                    const changedFieldsObj = { ArchivedAt: moment().format('MM/DD/YYYY HH:mm:ss'), CreatedBy: userId, Comment: x.comment || `Archived on ${new Date()}` }
                    await commonFunctions.createTicketHistory(x.ticketId, changedFieldsObj, t)
                    deletedTickets.push(x.ticketId)
                    deletedCount++
                } else {
                    notFoundTickets.push(x.ticketId)
                }
            })
        }
        if (Object.keys(ticketIdsToDelete).length === deletedCount) {
            return { success: true, deletedTickets: deletedTickets }
        } else {
            return { success: false, notFoundTickets: notFoundTickets }
        }
    } catch (err) {
        // Rollback transaction if any errors were encountered
        throw err
    }
}
