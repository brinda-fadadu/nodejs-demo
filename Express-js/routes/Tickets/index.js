const router = require('express').Router()
const archiveTicketHandler = require('./archiveTicket')
const createTicketHandler = require('./createTicket')
const getTicketHandler = require('./getTicketDetails')
const getTicketsListingHandler = require('./getTickets')
const updateTicketHandler = require('./updationsOnTicket')
const countsHandler = require('./getCountOfTickets')
const listOpenTicketHandler = require('./getOpenTickets')

const ticketValidations = require('../../lib/validations').createTicket
const listticketValidations = require('../../lib/validations').listTicketValidation
const ticketIdValidation = require('../../lib/validations').ticketIdValidation
const ticketUpdateValidation = require('../../lib/validations').ticketUpdateValidation
const assignTicketValidation = require('../../lib/validations').assignTicketValidation
const ticketStatusValidation = require('../../lib/validations').ticketStatusValidation
const commentTicketValidation = require('../../lib/validations').commentTicketValidation
const archiveTicketsValidations = require('../../lib/validations').archiveTicketsValidations
const openTicketsValidation = require('../../lib/validations').validateOpenTickets
const authentication = require('../../middleware/authentication')
const roleBasedAccess = require('../../middleware/roleAuth')

router.use(authentication)

router.put('/archive', roleBasedAccess('Maintenance', 'DELETE'), archiveTicketsValidations, archiveTicketHandler.archiveTicket)

router.use(roleBasedAccess('Maintenance'))

router.post('/', ticketValidations, createTicketHandler.createTicket)
router.get('/', listticketValidations, getTicketsListingHandler.listTickets)
router.get('/counts', countsHandler.getCountsOfTickets)
router.get('/opentickets', openTicketsValidation, listOpenTicketHandler.listOpenTickets)
router.get('/opentickets/export', listOpenTicketHandler.exportTickets)
router.get('/:id', ticketIdValidation, getTicketHandler.getTicket)
router.put('/:id', ticketUpdateValidation, updateTicketHandler.updateTicket)
router.put('/:id/assign', ticketIdValidation, assignTicketValidation, updateTicketHandler.updateTicket)
router.put('/:id/status', ticketIdValidation, ticketStatusValidation, updateTicketHandler.updateTicket)
router.post('/:id/comment', ticketIdValidation, commentTicketValidation, updateTicketHandler.updateTicket)
module.exports = router
