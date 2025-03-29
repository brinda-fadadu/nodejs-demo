const { customResponse } = require('../../lib/custom-response')
const logger = require('../../lib/logger')

// const commonFunctions = require('./commonFunctions')
// const getTicketController = require('../../controllers/Tickets/getTicket')
const callController = require('../../controllers/refactorControllers/callController/callController')

exports.getTicket = async (req, res) => {
    try {
        let ticketId = req.params ? req.params.id : req
        const result = await callController.getTicketDetails(ticketId)
        // const finalResult = await commonFunctions.getTicketDetails(result)
        customResponse(200, result, res)
    } catch (error) {
        logger.error(`Error while fetching ticket details ${error}`)
        customResponse(400, error, res)
    }
}
