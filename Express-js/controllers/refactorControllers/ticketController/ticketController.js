const models = require('../../../models')
const sequelize = require('sequelize')
const db = require('../../../models/index')
const moment = require('moment')
const { createUserInclude } = require('../commonIncludes')
const { getQueriableValues, commonDownloadFileWithSignature } = require('../utils')
const _ = require('lodash')
const ResourceDocumentsController = require('../resourceDocuments/resourceDocumentsController')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const callReasons = require('../../../config/seed').seed.CallReasons
const seedData = require('../../../config/seed').seed
const logger = require('../../../lib/logger')
const { getKey } = require('../../../lib/util')
class TicketController {
    static get TicketStatus () {
        return {
            1: 'Open',
            2: 'In-progress',
            3: 'Closed',
            4: 'Declined',
            5: 'Overdue',
            6: 'Archived'
        }
    }
    async createTicket (ticketData, ticketHistoryData) {
        let ticketId
        await models.sequelize.transaction(async (t) => {
            ticketData.ticketId = 'CLT-' + new Date().getTime().toString().slice(-6)
            ticketData.status = 1
            let createdTicket = await models.Ticket.create(ticketData, { transaction: t })
            ticketId = createdTicket.ticketId
            await this._createTicketHistory(ticketId, ticketHistoryData, t)
            if (_.get(ticketData, 'documents')) {
                await ResourceDocumentsController.createOrEditDocuments(createdTicket.id, 'Ticket', _.get(ticketData, 'documents', []), t)
            }
            return createdTicket
        })
        let ticket = await this.getTicket(ticketId)
        return ticket
    }

    async updateTicket (ticketId, ticketData, ticketHistoryData, t) {
        let updatedTicket = await models.Ticket.update(ticketData, { where: { ticketId }, transaction: t })
        await this._createTicketHistory(ticketId, ticketHistoryData, t)
        return updatedTicket
    }

    async getTicket (ticketId) {
        let ticket = await models.Ticket.scope('withTicketDocuments').findOne({
            where: {
                ticketId
            },
            include: [{
                model: models.Call.scope('withCallDocuments'),
                attributes: ['id', 'Identifier'],
                as: 'deceded',
                include: [{
                    model: models.GenealogySearchReason,
                    as: 'genealogySearchReason',
                    attributes: ['id'],
                    include: [{
                        model: models.Person,
                        as: 'decedent',
                        attributes: ['id', 'FirstName', 'LastName', 'MiddleName']
                    }]
                }, {
                    model: models.MaintenanceRequest,
                    as: 'maintenanceRequestReason',
                    attributes: ['id', 'graveMarkerLocation', 'serviceLocation', 'callId'],
                    include: [{
                        model: models.MaintenanceRequestCause,
                        as: 'maintenanceRequestReasonType'
                    }]
                }]
            },
            {
                model: models.Employee,
                as: 'assignedToId'
            },
            ...createUserInclude('createdById', ['id', 'Name']),
            ...createUserInclude('updatedById', ['id', 'Name']),
            ...createUserInclude('ownedBy', ['id', 'Name']),
            {
                model: models.TicketHistories,
                as: 'ticketHistory',
                attributes: ['id', 'TicketId', 'DueDate', 'Comment', 'Status', 'Priority', 'AssignedTo', 'Description', 'CreatedBy', 'ArchivedAt', 'CreatedAt', 'UpdatedAt'],
                include: [
                    {
                        model: models.Employee,
                        as: 'TicketHistoriesAssignedTo'
                    },
                    ...createUserInclude('TicketHistoriesCreatedBy', ['id', 'name'])
                ],
                group: [sequelize.fn('date_trunc', 'date', sequelize.col('updatedAt'))]
            }],
            order: [
                [{ model: models.TicketHistories, as: 'ticketHistory' }, 'UpdatedAt', 'DESC']
            ]
        })

        ticket = ticket.toJSON()
        ticket.assignedTo = ticket.assignedToId
        ticket.owner = ticket.Owner
        ticket.createdBy = ticket.CreatedBy
        ticket.updatedBy = ticket.UpdatedBy
        ticket.callId = ticket.deceded.Identifier
        const mappedticketHistory = ticket.ticketHistory.map(t => {
            t.assignedTo = t.ticketHistoryAssignedTo
            t.createdBy = t.ticketHistoryCreatedBy
            delete t.ticketHistoryAssignedTo
            delete t.ticketHistoryCreatedBy
            return t
        })
        const genealogyDecedentDetails = []
        if (ticket.deceded.geneologySearchReason) {
            ticket.deceded.geneologySearchReason.map(d => {
                genealogyDecedentDetails.push(d.decedent)
            })
        }
        ticket.ticketHistory = mappedticketHistory
        ticket.geneologySearchReason = genealogyDecedentDetails
        ticket.maintenanceRequestReason = ticket.deceded.maintenanceRequestReason

        if (ticket.ticketDocuments.length) {
            let signedUrls = []
            await Promise.all(ticket.ticketDocuments.map(async doc => {
                if ((doc.resourceDocumentImageUrl && doc.resourceDocumentImageUrl.originalFileName) || doc.imageUrl) {
                    let url = await commonDownloadFileWithSignature(doc.resourceDocumentImageUrl, doc.imageUrl)
                    doc.imageUrl = url
                    signedUrls.push(url)
                    return doc
                }
            }))
            ticket.storedTicketDocuments = ticket.ticketDocuments
            ticket.ticketDocuments = signedUrls
        }
        if (ticket.deceded.callDocuments) {
            let signedUrls = []
            await Promise.all(ticket.deceded.callDocuments.map(async doc => {
                if ((doc.resourceDocumentImageUrl && doc.resourceDocumentImageUrl.originalFileName) || doc.imageUrl) {
                    let url = await commonDownloadFileWithSignature(doc.resourceDocumentImageUrl, doc.imageUrl)
                    doc.imageUrl = url
                    signedUrls.push(url)
                    return doc
                }
            }))
            ticket.storedCallDocuments = ticket.deceded.callDocuments
            ticket.callDocuments = signedUrls
        }
        delete ticket.AssignedTo
        delete ticket.CreatedBy
        delete ticket.UpdatedBy
        delete ticket.OwnedBy
        delete ticket.deceded
        return ticket
    }

    async getListOfTickets (priority, assignedTo, callId, searchkey, reason, page, limit, sort, status, locationIds) {
        let priorityWhere = ''
        let assignedToWhere = ''
        let callIdWhere = ''
        let searchkeyWhere = ''
        let statusWhere = ''
        let archivedWhere = 'AND [Ticket].[archived] = 0'
        let offset
        let reasonWhere = getQueriableValues(reason)
        let locationWhere = ''

        if (locationIds) {
            let locationIdValues = getQueriableValues(locationIds)
            locationWhere = `AND [Call].[receivedLocationId] IN ${locationIdValues}`
        }
        if (priority) {
            priorityWhere = `AND [Ticket].[priority] = ${priority}`
        }
        if (assignedTo && assignedTo.length) {
            let assignedToValues = getQueriableValues(assignedTo)
            assignedToWhere = `AND [Ticket].[assignedTo] IN ${assignedToValues}`
        }
        if (callId) {
            callIdWhere = `AND [Ticket].[callId] = ${callId}`
        }
        if (status <= 4) {
            // let dueDatefilter = moment().format()
            statusWhere = `AND [Ticket].[status] = ${status}`
        } else if (status && Number(status) === 5) {
            let dueDatefilter = moment().format()
            statusWhere = `AND ([Ticket].[dueDate] < '${dueDatefilter}') AND ([Ticket].[status] = 1 OR [Ticket].[status] = 2 OR [Ticket].status = 4)`
        } else if (status && Number(status) === 6) {
            archivedWhere = `AND [Ticket].[archived] = 1`
        }

        if (searchkey) {
            searchkeyWhere = `AND ([Ticket].[title] LIKE '%${searchkey}%' OR [Ticket].[description] LIKE '%${searchkey}%' OR [Ticket].[ticketId] LIKE '%${searchkey}%')`
        }

        offset = (page - 1) * limit
        const sortOrder = sort || 'desc'
        const orderByQuery = `ORDER BY [Ticket].[updatedAt] ${sortOrder}`

        let query = `SELECT [Ticket].[id] AS [id],[title],[description],[ticketId],[dueDate],[Ticket].[status] AS [ticketStatus],[priority],[maintenanceType],[archived],[identifier],[name], 
        [Employee].[id] as [userId] FROM [Ticket]
        JOIN [Call]
        ON [Ticket].[callId] = [Call].[id]
        JOIN [Employee]
        ON [Ticket].[assignedTo] = [Employee].[id]
        WHERE [Call].[reasonId] IN ${reasonWhere}
        ${locationWhere}
        ${priorityWhere}
        ${statusWhere}
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
        if (callId) {
            const maintenanceReasonId = Object.keys(callReasons).find(key => callReasons[key] === 'Maintenance Request')
            const callDetails = await models.Call.scope('fetchingMaintenanceTickets').findOne({
                where: {
                    id: callId,
                    reasonId: maintenanceReasonId
                }
            })
            if (callDetails) {
                finalOutcome.totalNoOfTickets = _.get(callDetails, 'maintenanceRequestReason.maintenanceRequestReasonType').length
            }
        }
        return finalOutcome
    }

    async getTicketsCount (whereQueryInput, attributesAndGroupFieldsInput, reasonValue, locationIds) {
        let reason = reasonValue ? Number(reasonValue) : [3, 5]
        let whereQuery = { reasonId: reason }
        if (locationIds) {
            whereQuery.ReceivedLocationId = locationIds
        }
        const countResult = await models.Ticket.count({
            where: whereQueryInput,
            include: [{
                model: models.Call,
                attributes: ['id', 'reasonId'],
                as: 'deceded',
                where: whereQuery
            }],
            attributes: attributesAndGroupFieldsInput,
            group: attributesAndGroupFieldsInput
        })
        return countResult
    }

    async _createTicketHistory (ticketId, ticketHistoryData, t) {
        ticketHistoryData.ticketId = ticketId
        let ticketHistory = await models.TicketHistories.create(ticketHistoryData, { transaction: t })
        return ticketHistory
    }

    static async getMaintenanceTicket () {
        let checkDueDate = moment().add(2, 'days').format()
        let ticket = await models.Ticket.findAll({
            where: {
                dueDate: { [Op.lte]: checkDueDate },
                status: 1,
                archived: 0
            },
            include: [
                { model: models.Call,
                    where: { reasonId: 3 },
                    as: 'deceded' }
            ]
        })
        const { queueNames, queues } = require('../../../appQueues')
        const maintenaceWorker = queues[queueNames.MaintenanceTicketWorkerJob]
        maintenaceWorker.add(ticket)
    }

    static async getGenealogyTicket () {
        let checkDueDate = moment().add(2, 'days').format()
        let ticket = await models.Ticket.findAll({
            where: {
                dueDate: { [Op.lte]: checkDueDate },
                status: 1,
                archived: 0
            },
            include: [
                { model: models.Call,
                    where: { reasonId: 5 },
                    as: 'deceded' }
            ]
        })
        const { queueNames, queues } = require('../../../appQueues')
        const genealogyWorker = queues[queueNames.GenealogyTicketWorkerJob]
        genealogyWorker.add(ticket)
    }
    static async queryObjWhereForOpenTickets (queryObj) {
        const { status, timezone, dueDateFrom, dueDateTo, priority, assignedTo, ticketId, type, callId, callDateFrom, callDateTo, callerName } = queryObj
        const openTicketStatus = status || [Number(getKey(seedData.TicketStatus, 'Open')), Number(getKey(seedData.TicketStatus, 'Inprogress'))]
        let sql = ` WHERE [Ticket].[status] in (${openTicketStatus})`
        Object.keys(queryObj).map((e) => {
            switch (e) {
            case 'priority':
                sql += ` AND [Ticket].[priority] = ${priority}`
                break
            case 'assignedTo' :
                sql += ` AND [Ticket].[assignedTo] = ${assignedTo}`
                break
            case 'ticketId' :
                sql += ` AND [Ticket].[ticketId] LIKE '${ticketId}%'`
                break
            case 'type' :
                sql += ` AND [deceded].[reasonId] IN (${type})`
                break
            case 'callId' :
                sql += ` AND [deceded].[identifier] LIKE '${callId}%'`
                break
            case 'callerName' :
                sql += ` AND ([deceded->caller].[prefix] LIKE '%${callerName}%' 
                OR [deceded->caller].[firstName] LIKE '%${callerName}%' 
                OR [deceded->caller].[middleName] LIKE '%${callerName}%' 
                OR [deceded->caller].[lastName] LIKE '%${callerName}%')`
            }
        })
        if (callDateFrom && callDateTo) {
            let startDate = moment(callDateFrom).tz(timezone).startOf('day').format('YYYY/MM/DD')
            let endDate = moment(callDateTo).tz(timezone).endOf('day').format('YYYY/MM/DD')
            sql += ` AND [deceded].[createdAt] BETWEEN '${startDate}' AND '${endDate}'`
        }
        if (dueDateTo && dueDateFrom) {
            let startDate = moment(dueDateFrom).tz(timezone).startOf('day').format('YYYY/MM/DD')
            let endDate = moment(dueDateTo).tz(timezone).endOf('day').format('YYYY/MM/DD')
            sql += ` AND [Ticket].[dueDate] BETWEEN  '${startDate}' AND '${endDate}'`
        }
        if (_.get(queryObj, 'caseIds') && _.get(queryObj, 'caseIds').length > 0) {
            sql = `WHERE [Ticket].[id] IN (select value from STRING_SPLIT('${queryObj.caseIds.join(',')}', ','))`
        }
        return sql
    }

    // get and export for open tickets.
    /**
     * @param {*} queryObject is the object of all the queries done for fetching the open tickets
     * @param {Number} page the page number to fetch data
     * @param {Number} limit number of records to fetch
     * @param {String} sortOrder asc || desc value to group ticket createdBy date
     * @param {String} priority high,low,medium priority
     * @param {String} ticketId ticket number
     * @param {Date} dueDateFrom filter due date upper value
     * @param {Date} dueDateTo filter due date lower value
     * @param {Number} status open || inProgress ticket status
     * @param {String} callId call identifier
     * @param {String} callerName Name of caller
     * @param {Date} callDateFrom upper value to filter based on callDate
     * @param {Date} callDateTo lower value to filter based on callDate
     * @param {Number} assignedTo get the calls list based on the staffId.
     * @param {Number} type reasonId in response, either maintanence or genology type
     */
    static async getListOfOpenTickets (queryParam) {
        const { page, limit } = queryParam
        const sortOrder = queryParam.sortOrder || 'desc'
        try {
            let whereQuery = await this.queryObjWhereForOpenTickets(queryParam)
            const offset = (page - 1) * limit
            let query = `SELECT [Ticket].[id], 
            [Ticket].[ticketId], 
            [Ticket].[dueDate], 
            [Ticket].[maintenanceType],
            DATEDIFF(DAY, GETUTCDATE(), [Ticket].[dueDate]) AS [countDueDate],
            [Ticket].[priority],
            [Ticket].[status],
            [deceded].[identifier] AS [callId], 
            [deceded].[reasonId] AS [type], 
            [deceded].[createdAt] AS [callDate],  
            [deceded->caller].[suffix] AS [suffix],
            [deceded->caller].[firstName] AS [firstName],
            [deceded->caller].[middleName] AS [middleName],
            [deceded->caller].[lastName] AS [lastName], 
            [assignedToId].[name] AS [assignedTo]
        FROM [Ticket] AS [Ticket] INNER JOIN [Call] AS [deceded] ON [Ticket].[callId] = [deceded].[id] 
                INNER JOIN [Person] AS [deceded->caller] ON [deceded].[callerId] = [deceded->caller].[id] 
                LEFT OUTER JOIN [Employee] AS [assignedToId] ON [Ticket].[assignedTo] = [assignedToId].[id]
        ${whereQuery} ORDER BY [Ticket].[updatedAt] ${sortOrder}`
            if (page) query += ` ,[Ticket].[id] OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;`

            const openTicketsList = await db.sequelize.query(query, {
                type: db.sequelize.QueryTypes.SELECT
            })
            return openTicketsList
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
}
module.exports = TicketController
