// Call
const { createCallValidation, getCallValidation } = require('./call/createOrEdit')
const verifyCall = require('./call/verifyCall')
const validateDuplicateCalls = require('./call/duplicateCalls')
const validateDuplicateCases = require('./caseInfo/duplicateCases')

// Ticket
const createTicketValidation = require('./ticketApiValidations/createTicketValidation')
const getTicketValidation = require('./ticketApiValidations/getTicketValidation')
const getTicketsListingValidation = require('./ticketApiValidations/getTicketsListingValidation')
const updateTicketValidation = require('./ticketApiValidations/validationOnTicketUpdation')
const archiveTicketValidation = require('./ticketApiValidations/archiveTicketsValidations')
const updateAnRemainsValidation = require('./anremainsInfo/updateAnremainsInfo')
const openTicketsValidation = require('./ticketApiValidations/getOpenTicketsValidation')
// Case
const ongoingCases = require('./caseInfo/ongoing')
const anReportList = require('./caseInfo/anreport')
// Call
exports.createCall = createCallValidation
exports.login = require('./login')
exports.editCall = createCallValidation
exports.listCalls = require('./call/listCalls')
exports.convertCallToCase = require('./convertCallToCase')
exports.bulkDeleteCalls = require('./bulkDeleteCalls')
exports.verifyCall = verifyCall
exports.validateDuplicateCalls = validateDuplicateCalls
exports.validateDuplicateCases = validateDuplicateCases
exports.anReportList = anReportList
exports.note = require('./note')
exports.getCall = getCallValidation

// Ticket
exports.createTicket = createTicketValidation.createTicketValidation
exports.listTicketValidation = getTicketsListingValidation.listTicketValidation
exports.ticketIdValidation = getTicketValidation.ticketIdValidation
exports.ticketUpdateValidation = updateTicketValidation.ticketUpdateValidation
exports.ticketStatusValidation = updateTicketValidation.ticketStatusValidation
exports.assignTicketValidation = updateTicketValidation.assignTicketValidation
exports.commentTicketValidation = updateTicketValidation.commentTicketValidation
exports.archiveTicketsValidations = archiveTicketValidation.archiveTicketsValidations
exports.statementValidations = require('./statement')

exports.updateAnRemainsInfo = updateAnRemainsValidation.updateAnremains
exports.validateOpenTickets = openTicketsValidation.validateOpenTickets
// Case
exports.ongoingCases = ongoingCases

exports.interestedService = require('./familyPortal/interestedServices')
exports.obituary = require('./familyPortal/updateObituary')
