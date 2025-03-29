const logger = require('../lib/logger')
const Email = require('../lib/Emailer/core')
const moment = require('moment')
const maintenanceReceipent = process.env.MAINTENANCE_REMINDER_EMAIL_ID
const genealogyReceipent = process.env.GENEALOGY_REMINDER_EMALI_ID
const DateFormat = 'Do MMMM YYYY'

function MaintenanceTicketEmailWorker (job, done) {
    logger.info(`Processing maintenance ticket email job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
    try {
        let data = job.data
        const ticketIds = data.map(e => (`Ticket Id: ` + e.ticketId + `, Due date: ` + moment(e.dueDate).format(DateFormat))).reduce((acc, cv) => acc + '\n' + cv)
        let text = `Hi,\nBelow are the tickets that are yet to be accepted. Please login to oneportal and do the needful.\n\n${ticketIds} \n\n-One portal`
        Email.sendMail(maintenanceReceipent, `REMINDER - Unaccepted Tickets - ${moment().format(DateFormat)}`, text)

        logger.info(`Done Maintenance ticket job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
        done(null, { data: job.data })
    } catch (e) {
        logger.error(e)
        done(e)
    }
}

function GenealogyTicketEmailWorker (job, done) {
    logger.info(`Processing genealogy ticket email job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
    try {
        let data = job.data
        const ticketIds = data.map(e => (`Ticket Id: ` + e.ticketId + `, Due date: ` + moment(e.dueDate).format(DateFormat))).reduce((acc, cv) => acc + '\n' + cv)
        let text = `Hi,\nBelow are the tickets that are yet to be accepted. Please login to oneportal and do the needful.\n\n${ticketIds} \n\n-One portal`
        Email.sendMail(genealogyReceipent, `REMINDER - Unaccepted Tickets - ${moment().format(DateFormat)}`, text)

        logger.info(`Done genealogy ticket job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
        done(null, { data: job.data })
    } catch (e) {
        logger.error(e)
        done(e)
    }
}

module.exports = {
    MaintenanceTicketEmailWorker,
    GenealogyTicketEmailWorker
}
