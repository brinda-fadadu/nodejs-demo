const Sequelize = require('sequelize')
const Op = Sequelize.Op
const { customResponse } = require('../../lib/custom-response')
const logger = require('../../lib/logger')
const models = require('../../models')
// const getTicketCountController = require('../../controllers/Tickets/getCount')
// const callController = require('../../controllers/refactorControllers/callController/callController')
const TicketController = require('../../controllers/refactorControllers/ticketController/ticketController')
const common = require('./commonFunctions')

const getTicketCountByStatus = async (ticketStatusType, locationIds) => {
    let attributesAndGroupFieldsInput = ['deceded.reasonId', models.sequelize.col('Ticket.status')]
    let whereQueryInput = { Status: [1, 2, 3, 4] }

    switch (ticketStatusType) {
    case 'overDue':
        whereQueryInput = {
            [Op.and]: [
                { Status: [1, 2, 4] },
                { dueDate: { [Op.lt]: new Date() } },
                {archived : false},
            ]
        }
        break
    case 'archived':
        whereQueryInput = {
            archived: true
        }
        break
    default:
        whereQueryInput = {
            [Op.and]: [
                { Status: [1, 2, 3, 4] },
                {archived : false}
            ]
        }
    }
    const ticketController = new TicketController()
    const getCountResult = await ticketController.getTicketsCount(
        whereQueryInput,
        attributesAndGroupFieldsInput,
        null,
        locationIds
    )
    return getCountResult
}

const getTicketCountByPriority = async (status, type, callId, locationIds) => {
    let attributesAndGroupFieldsInput = ['deceded.reasonId', models.sequelize.col('Ticket.status'), 'priority']
    let whereQueryInput = { status: [1, 2, 3, 4],archived : false }

    if (Number(status) < 5) {
        whereQueryInput = {
            [Op.and]: [
                { Status: status },
                {archived : false}
            ]
        }
    } else if (Number(status) === 5) {
        whereQueryInput = {
            [Op.and]: [
                { Status: [1, 2, 4] },
                { dueDate: { [Op.lt]: new Date() } },
                {archived : false}
            ]
        }
    } else if (Number(status) === 6) {
        whereQueryInput = { archived: true }
    } else if (Number(status) === 7) {
        if (callId) {
            whereQueryInput = { callId, archived : false }
        } else {
            whereQueryInput = { archived : false }
        }
    }

    const ticketController = new TicketController()
    const getCountResult = await ticketController.getTicketsCount(
        whereQueryInput,
        attributesAndGroupFieldsInput,
        type,
        locationIds
    )
    return getCountResult
}

exports.getCountsOfTickets = async (req, res) => {
    try {
        const { countBy, status, type, callId } = req.query
        const locationIds = req.query.locationIds ? JSON.parse(req.query.locationIds).map(a => Number(a)) : null

        let result
        switch (countBy) {
        case 'priority':
            result = await getTicketCountByPriority(status, type, callId, locationIds)
            result = await common.getAllPriorityCount(result, req.query.status)
            break
        default:
            const allTicket = await getTicketCountByStatus(null, locationIds)
            const archivedCount = await getTicketCountByStatus('archived', locationIds)
            const overDueCount = await getTicketCountByStatus('overDue', locationIds)
            let getAllCount = await common.getAllCount(allTicket, overDueCount, archivedCount)
            result = {
                ...getAllCount
            }
        }
        customResponse(200, result, res)
    } catch (error) {
        logger.error(`Error while fetching tickets count ${error}`)
        customResponse(400, error, res)
    }
}
