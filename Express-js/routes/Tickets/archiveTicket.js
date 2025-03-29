const sendResponse = require('../../lib/custom-response')
const logger = require('../../lib/logger')

// const archiveTicketController = require('../../controllers/Tickets/archiveTicket')
const callController = require('../../controllers/refactorControllers/callController/callController')

exports.archiveTicket = async (req, res) => {
    try {
        const result = await callController.archiveTicket(req.body.archiveTicketList, req.currentUser.id)
        if (result.success) {
            logger.info(`Ticket archived successfully`)
            res.status(200).json(result)
        } else {
            logger.info(`Ticket archived successfully`)
            res.status(422).json(result)
        }
    } catch (error) {
        logger.error(`Error while archiving ticket ${error}`)
        sendResponse(400, error, res)
    }
}
