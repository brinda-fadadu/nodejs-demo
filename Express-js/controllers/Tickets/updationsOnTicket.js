const models = require('../../models')
const commonFunctions = require('./commonFunctions')
const { TicketEmailer } = require('../../lib/Emailer')
const SMS = require('../../lib/SMSNotification/sms')

exports.updateTicket = async function (ticketId, ticketData, userId) {
    try {
        let outcome = await models.sequelize.transaction(async (t) => {
            const result = await commonFunctions.updatingTicket(ticketId, ticketData, userId, t)
            const changedFieldsObj = { DueDate: ticketData.dueDate, Priority: ticketData.priority, CreatedBy: userId, Description: ticketData.description }
            await commonFunctions.createTicketHistory(ticketId, changedFieldsObj, t)
            return result
        })
        return outcome
    } catch (error) {
        throw error
    }
}

exports.assignTicket = async function (ticketId, assignticketData, userId) {
    try {
        await models.sequelize.transaction(async (t) => {
            const result = await commonFunctions.updatingTicket(ticketId, assignticketData, userId, t)
            const changedFieldsObj = { AssignedTo: assignticketData.user, CreatedBy: userId }
            await commonFunctions.createTicketHistory(ticketId, changedFieldsObj, t)
            // todo: send notification to user i.e whoom the ticket is assigned
            const assignedTo = await models.User.findByPk(assignticketData.user)
            TicketEmailer.sendEmailNotification(assignedTo, 'New ticket', `A new ticket ${ticketId} has been assigned to you.`)
            SMS.sendSms(14123468550, 'Test email from CL')
            return result
        })
    } catch (error) {
        throw error
    }
}

exports.changeStatusOfTicket = async function (ticketId, statusInput, userId) {
    try {
        await models.sequelize.transaction(async (t) => {
            const result = await commonFunctions.updatingTicket(ticketId, statusInput, userId, t)
            const changedFieldsObj = { Status: statusInput.status, Comment: statusInput.comment, CreatedBy: userId }
            const ticketData = await commonFunctions.createTicketHistory(ticketId, changedFieldsObj, t)
            // todo: send notification to userid based on the status of the ticket
            const owner = await models.User.findByPk(ticketData.Owner)
            TicketEmailer.sendEmailNotification(owner, 'Ticket Status Changed', `The status of your ticket ${ticketId} has been changed to ${statusInput.status}.`)
            SMS.sendSms(14123468550, 'Test message from CL')
            return result
        })
    } catch (error) {
        throw error
    }
}

exports.commentTicket = async function (ticketId, commentInput, userId) {
    try {
        await models.sequelize.transaction(async (t) => {
            const result = await commonFunctions.updatingTicket(ticketId, {}, userId, t)
            const changedFieldsObj = { Comment: commentInput.comment, CreatedBy: userId }
            await commonFunctions.createTicketHistory(ticketId, changedFieldsObj, t)
            return result
        })
    } catch (error) {
        throw error
    }
}
