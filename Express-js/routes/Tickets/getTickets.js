const { customResponse } = require('../../lib/custom-response')
const logger = require('../../lib/logger')
const commonFunctions = require('./commonFunctions')
const _ = require('lodash')
// const getTicketsListingController = require('../../controllers/Tickets/getTicketsList')
const callController = require('../../controllers/refactorControllers/callController/callController')
const util = require('../../lib/util')
const seedValues = require('../../config/seed')
let callReasons = seedValues.seed.CallReasons

exports.listTickets = async (req, res) => {
    try {
        let reason = [util.getKey(callReasons, 'Maintenance Request'), util.getKey(callReasons, 'Genealogy Search')]
        let status, priority, assignedTo, callId, location

        if (req.query.type) {
            reason = [Number(req.query.type)]
        }
        if (req.query.status) {
            status = Number(req.query.status)
        }
        if (req.query.priority) {
            priority = Number(req.query.priority)
        }
        if (req.query.assignedTo) {
            // Info: Below logic will work if request is coming from front end. not from postman
            assignedTo = JSON.parse(req.query.assignedTo).map(a => Number(a))
        }
        if (req.query.callId) {
            callId = Number(req.query.callId)
        }
        if (!_.isEmpty(req.query.locationIds) && _.isArray(JSON.parse(req.query.locationIds))) {
            location = JSON.parse(req.query.locationIds).map(a => Number(a))
            // JSON.parse(req.query.locationIds).map(a => Number(a))
        }
        const result = await callController.getListOfTickets(priority, assignedTo, callId, req.query.search, reason, Number(req.query.page), Number(req.query.limit), req.query.sort, status, location)
        const finalResult = await result.ticketsList.map(commonFunctions.getTickets)
        const mappedTickets = []
        for (const job of finalResult) {
            const _result = await job
            mappedTickets.push(_result)
        }
        const resObj = {
            tickets: mappedTickets,
            count: result.ticketsCount
        }
        if (result.totalNoOfTickets) {
            resObj.totalNoOfTickets = result.totalNoOfTickets
        }
        customResponse(200, resObj, res)
    } catch (error) {
        logger.error(`Error while fetching tickets list ${error}`)
        customResponse(400, error, res)
    }
}
