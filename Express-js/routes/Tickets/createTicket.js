const { customResponse } = require('../../lib/custom-response')
const logger = require('../../lib/logger')
const models = require('../../models')

const callController = require('../../controllers/refactorControllers/callController/callController')

exports.createTicket = async (req, res) => {
    try {
        const userId = req.currentUser.id
        let ticketData = req.body.ticket
        ticketData.owner = ticketData.createdBy = userId

        if (await getEmployeeDetails(ticketData.assignedTo)) {
            let ticketHistoryData = {
                createdBy: userId,
                assignedTo: ticketData.assignedTo,
                dueDate: ticketData.dueDate,
                status: 1,
                description: ticketData.description,
                priority: ticketData.priority
            }
            const result = await callController.createTicket(
                ticketData,
                ticketHistoryData
            )
            logger.info('Ticket created successfully')
            customResponse(201, result, res)
        } else {
            logger.info(`Assignee is not authorized user`)
            res.status(422).json(`Assignee is not authorized user`)
        }
    } catch (error) {
        logger.error(`Ticket creation failed: ${error}`)
        customResponse(400, error, res)
    }
}

const getEmployeeDetails = async id => {
    const assignedTo = await models.Employee.findOne({
        where: { id: id },
        attributes: ['name', 'id']
    })
    return assignedTo
}
