const db = require('../../models/index')
const moment = require('moment')

function getQueriableValues (valuesArray) {
    try {
        if (valuesArray.length) {
            let stringifiedValues = '(' + valuesArray.join(', ') + ')'
            return stringifiedValues
        }
    } catch (err) {
        throw err
    }
}
exports.getTicketsList = async function (priority, assignedTo, callId, searchkey, reason, page, limit, sort, status, locationIds) {
    try {
        let priorityWhere = ''
        let assignedToWhere = ''
        let callIdWhere = ''
        let searchkeyWhere = ''
        let statusWhere = ''
        let archivedWhere = `AND [Ticket].[Archived] = 0`
        let offset
        let reasonWhere = getQueriableValues(reason)
        let locationWhere = ''

        if (locationIds) {
            let locationIdValues = getQueriableValues(locationIds)
            locationWhere = `AND [Call].[ReceivedLocationId] IN ${locationIdValues}`
        }
        if (priority) {
            priorityWhere = `AND [Ticket].[Priority] = ${priority}`
        }
        if (assignedTo && assignedTo.length) {
            let assignedToValues = getQueriableValues(assignedTo)
            assignedToWhere = `AND [Ticket].[AssignedTo] IN ${assignedToValues}`
        }
        if (callId) {
            callIdWhere = `AND [Ticket].[CallId] = ${callId}`
        }
        if (status <= 4) {
            statusWhere = `AND [Ticket].[Status] = ${status}`
        } else if (status && Number(status) === 5) {
            let dueDatefilter = moment().format()
            statusWhere = `AND ([Ticket].[DueDate] < '${dueDatefilter}') AND ([Ticket].[Status] = 1 OR [Ticket].[Status] = 2 OR [Ticket].status = 4)`
        } else if (status && Number(status) === 6) {
            archivedWhere = `AND [Ticket].[Archived] = 1`
        } else {

        }

        if (searchkey) {
            searchkeyWhere = `AND ([Ticket].[Title] LIKE '%${searchkey}%' OR [Ticket].[Description] LIKE '%${searchkey}%' OR [Ticket].[TicketId] LIKE '%${searchkey}%')`
        }

        offset = (page - 1) * limit
        const sortOrder = sort || 'desc'
        const orderByQuery = `ORDER BY [Ticket].[UpdatedAt] ${sortOrder}`

        let query = `SELECT [Ticket].[id] AS [id],[Title],[Description],[TicketId],[DueDate],[Status],[Priority],[MaintenanceType],[Archived],[Identifier],[Name], 
        [User].[id] as [userId] FROM [Ticket]
        JOIN [Call]
        ON [Ticket].[CallId] = [Call].[id]
        JOIN [User]
        ON [Ticket].[AssignedTo] = [User].[id]
        WHERE [Call].[Reason] IN ${reasonWhere}
        ${locationWhere}
        ${statusWhere}
        ${priorityWhere}
        ${assignedToWhere}
        ${callIdWhere}
        ${searchkeyWhere}
        ${archivedWhere}`

        const ticketsListCount = await db.sequelize.query(query, {
            type: db.sequelize.QueryTypes.SELECT
        })

        query += `${orderByQuery} OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`

        const ticketsList = await db.sequelize.query(query, {
            type: db.sequelize.QueryTypes.SELECT
        })
        const finalOutcome = { ticketsCount: ticketsListCount.length, ticketsList: ticketsList }
        return finalOutcome
    } catch (err) {
        console.log(err)
        throw err
    }
}
