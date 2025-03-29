const logger = require('../lib/logger')
const PropertyReservationController = require('../controllers/refactorControllers/agreementController/propertyReservationTypeController')
const TicketController = require('../controllers/refactorControllers/ticketController/ticketController')
const quotationController = require('../controllers/refactorControllers/quotationController/quotationController')

async function releasePropertyScheduler (job, done) {
    try {
        await PropertyReservationController.updateReservationType()
        done(null, {})
    } catch (error) {
        logger.error(error)
        done(error)
    }
}

async function maintenanceTicketScheduler (job, done) {
    try {
        await TicketController.getMaintenanceTicket()
        done(null, {})
    } catch (error) {
        logger.error(error)
        done(error)
    }
}
async function genealogyTicketScheduler (job, done) {
    try {
        await TicketController.getGenealogyTicket()
        done(null, {})
    } catch (error) {
        logger.error(error)
        done(error)
    }
}

async function removeJunkQuotation (job, done) {
    try {
        logger.info(`filter quotation table job trigged on : ${new Date()}`)
        await quotationController.removeJunkQuotation()
        logger.info(`done junk quotation records from table, ${JSON.stringify(job.id)}  ' ----> ' ${JSON.stringify(job.data.id)}`)
        done(null, { success: true, jobId: job.id, date: new Date() })
    } catch (error) {
        logger.info(`error in deteting junk quotation records + ${JSON.stringify(job.id)}  ' ----> '  ${JSON.stringify(job.id)}`)
        logger.error(error)
        done(error)
    }
}

module.exports = { releasePropertyScheduler, maintenanceTicketScheduler, genealogyTicketScheduler, removeJunkQuotation }
