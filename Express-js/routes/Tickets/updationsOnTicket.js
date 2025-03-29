const { customResponse } = require('../../lib/custom-response')
const logger = require('../../lib/logger')

// const updateTicketController = require('../../controllers/Tickets/updationsOnTicket')
const callController = require('../../controllers/refactorControllers/callController/callController')
// const getTicketRoute = require('../../routes/Tickets/getTicketDetails')

/* exports.updateTicket = async (req, res) => {
    try {
        // const result = await updateTicketController.updateTicket(req.params.id, req.body.ticket, req.currentUser.id)
        let ticketData = req.body.ticket
        let userId = req.currentUser.id
        let ticketHistoryData = {
            description: req.body.ticket.description,
            priority: req.body.ticket.priority,
            dueDate: req.body.ticket.dueDate
        }
        ticketData.updatedBy = ticketHistoryData.createdBy = userId
        const result = await callController.updateTicket(req.params.id, ticketData, ticketHistoryData)
        if (result) {
            logger.info(`Ticket updated successfully`)
            return getTicketRoute.getTicket(req.params.id, res)
        } else {
            logger.error(`Error while updating a ticket ${result}`)
            sendResponse(400, result, res)
        }
    } catch (error) {
        logger.error(`Error while updating ticket ${error}`)
        sendResponse(400, error, res)
    }
}

exports.assignTicket = async (req, res) => {
    try {
        // const result = await updateTicketController.assignTicket(req.params.id, req.body.ticket, req.currentUser.id)
        let userId = req.currentUser.id
        let ticketData = req.body.ticket
        let ticketHistoryData = req.body.ticket
        ticketData.updatedBy = ticketHistoryData.createdBy = userId
        const result = await callController.updateTicket(req.params.id, req.body.ticket, req.currentUser.id)
        logger.info(`Ticket assigned successfully`)
        sendResponse(200, result, res)
    } catch (error) {
        logger.error(`Error while assinging tickets count ${error}`)
        sendResponse(400, error, res)
    }
}

exports.changeStatusOfTicket = async (req, res) => {
    try {
        let reqObj = req.body.ticket
        if (reqObj.status <= 4) {
            // const result = await updateTicketController.changeStatusOfTicket(req.params.id, req.body.ticket, req.currentUser.id)
            let userId = req.currentUser.id
            let ticketData = req.body.ticket
            ticketData.updatedBy = userId
            let ticketHistoryData = req.body.ticket.comment ? { comment: req.body.ticket.comment, createdBy: userId } : {}
            const result = await callController.updateTicket(req.params.id, ticketData, ticketHistoryData)
            logger.info(`Ticket status changed successfully`)
            sendResponse(200, result, res)
        } else {
            logger.error(`Error while changing status of a ticket because user sent invalid status value`)
            res.status(422).json({
                message: `Status value is invalid`
            })
        }
    } catch (error) {
        logger.error(`Error while changing status of a ticket ${error}`)
        sendResponse(400, error, res)
    }
}

exports.commentTicket = async (req, res) => {
    try {
        // const result = await updateTicketController.commentTicket(req.params.id, req.body.ticket, req.currentUser.id)
        let userId = req.currentUser.id
        let ticketData = {
            updatedBy: userId
        }
        let ticketHistoryData = req.body.ticket
        ticketHistoryData.createdBy = userId
        const result = await callController.updateTicket(req.params.id, ticketData, ticketHistoryData)
        logger.info(`Ticket commented successfully`)
        sendResponse(200, result, res)
    } catch (error) {
        logger.error(`Error while commenting a ticket ${error}`)
        sendResponse(400, error, res)
    }
} */

exports.updateTicket = async (req, res) => {
    try {
        let result
        let userId = req.currentUser.id
        let ticketData = req.body.ticket
        let ticketHistoryData = req.body.ticket
        ticketData.updatedBy = ticketHistoryData.createdBy = userId
        switch (req.body.reservationStatus) {
        case 'update':
            delete ticketHistoryData.title
            break

        case 'changeStatus':
            ticketHistoryData = req.body.ticket.comment ? { comment: req.body.ticket.comment, createdBy: userId } : {}
            break

        case 'comment':
            ticketData = {
                updatedBy: userId
            }
            break

        default:
            break
        }
        result = await callController.updateTicket(req.params.id, ticketData, ticketHistoryData)
        logger.info(`Ticket updated successfully`)
        customResponse(200, result, res)
    } catch (error) {
        logger.error(`Error while updating a ticket ${error}`)
        customResponse(400, error, res)
    }
}
