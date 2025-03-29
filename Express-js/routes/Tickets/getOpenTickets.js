const TicketController = require('../../controllers/refactorControllers/ticketController/ticketController')
const _ = require('lodash')
const moment = require('moment')
const Json2csvParser = require('json2csv').Parser
const logger = require('../../lib/logger')
const { getFullNameOfPerson } = require('../../controllers/refactorControllers/utils')
const seedData = require('../../config/seed').seed
const maintenanceType = _.get(seedData, 'MaintenanceTypes')
const ticketPriority = _.get(seedData, 'TicketPriority')
const ticketStatus = _.get(seedData, 'TicketStatus')
const ticketType = _.get(seedData, 'CallReasons')
const { getKey } = require('../../lib/util')
const { sendErrorResponse } = require('../../lib/errorResponse')

const { customResponse } = require('../../lib/custom-response')

function findValue (objectCollection, valueToFind) {
    let keys = Object.keys(objectCollection)
    let values = Object.values(objectCollection)
    return values[keys.indexOf(valueToFind)]
}

exports.listOpenTickets = async (req, res, next) => {
    try {
        const result = await TicketController.getListOfOpenTickets(req.query)
        customResponse(200, result, res)
    } catch (error) {
        logger.error(error)
        throw error
    }
}

exports.exportTickets = async (req, res, next) => {
    try {
        let data = await TicketController.getListOfOpenTickets(req.query)
        if (data.length) {
            let exportRes = data.map((e, key) => {
                return {
                    'CALLER NAME': getFullNameOfPerson(e),
                    'CALL DATE': moment(e.callDate).tz(req.query.timezone).format('MM/DD/YYYY hh:mm'),
                    'TICKET NUMBER': e.ticketId,
                    'ASSIGNED TO': e.assignedTo,
                    'DUE DATE': moment(e.dueDate).tz(req.query.timezone).format('MM/DD/YYYY hh:mm'),
                    'CALL ID': e.callId,
                    'COUNT TO DUE DATE': e.countDueDate,
                    'TYPE': e.type === Number(getKey(seedData.CallReasons, 'Maintenance Request'))
                        ? `${findValue(ticketType, (e.type).toString())}: ${findValue(maintenanceType, (e.maintenanceType).toString())}`
                        : findValue(ticketType, (e.type).toString()),
                    'PRIORITY': findValue(ticketPriority, (e.priority)),
                    'STATUS': findValue(ticketStatus, (e.status).toString())
                }
            })
            const json2csvParser = new Json2csvParser({ excelStrings: true })
            const csv = json2csvParser.parse(exportRes)
            res.attachment('openTickets.csv')
            res.send(Buffer.from(csv))
        } else {
            sendErrorResponse({
                statusCode: 200,
                message: 'No tickets found for the given criteria'
            }, res)
        }
    } catch (error) {
        logger.error(error)
        throw error
    }
}
