exports.getTicketDetails = async (ticket) => {
    ticket = ticket.toJSON()
    ticket.AssignedTo = ticket.assignedTo
    ticket.Owner = ticket.ownedBy
    ticket.CreatedBy = ticket.createdBy
    ticket.UpdatedBy = ticket.updatedBy
    ticket.CallId = ticket.Deceded.Identifier
    const mappedticketHistory = ticket.ticketHistory.map(t => {
        t.AssignedTo = t.ticketHistoryAssignedTo
        t.CreatedBy = t.ticketHistoryCreatedBy
        delete t.ticketHistoryAssignedTo
        delete t.ticketHistoryCreatedBy
        return t
    })
    const genealogyDecedentDetails = []
    if (ticket.Deceded.geneologySearchReason) {
        ticket.Deceded.geneologySearchReason.map(d => {
            genealogyDecedentDetails.push(d.decedent)
        })
    }
    ticket.ticketHistory = mappedticketHistory
    ticket.geneologySearchReason = genealogyDecedentDetails
    ticket.maintenanceRequestReason = ticket.Deceded.maintenanceRequestReason
    delete ticket.assignedTo
    delete ticket.createdBy
    delete ticket.updatedBy
    delete ticket.ownedBy
    delete ticket.Deceded
    return ticket
}
exports.getTickets = async (ticket) => {
    ticket.AssignedTo = { id: ticket.userId, Name: ticket.Name }
    ticket.CallId = ticket.Identifier
    delete ticket.Name
    delete ticket.userId
    return ticket
}

exports.getAllCount = async (statusResult, overdueStatusResult, archiveResult) => {
    let genealogyStatusCount = { open: 0, inProgress: 0, closed: 0, declined: 0, overdue: 0, archived: 0 }
    let maintainenceStatusCount = { open: 0, inProgress: 0, closed: 0, declined: 0, overdue: 0, archived: 0 }
    statusResult.map((s) => {
        switch (s.reasonId) {
        case 3:
            switch (s.status) {
            case 1:
                maintainenceStatusCount.open += s.count
                break
            case 2:
                maintainenceStatusCount.inProgress += s.count
                break
            case 3:
                maintainenceStatusCount.closed += s.count
                break
            case 4:
                maintainenceStatusCount.declined += s.count
                break
            default:
                break
            }
            break
        case 5:
            switch (s.status) {
            case 1:
                genealogyStatusCount.open += s.count
                break
            case 2:
                genealogyStatusCount.inProgress += s.count
                break
            case 3:
                genealogyStatusCount.closed += s.count
                break
            case 4:
                genealogyStatusCount.declined += s.count
                break
            default:
                break
            }
            break
        default:
            break
        }
    })
    overdueStatusResult.map((o) => {
        switch (o.reasonId) {
        case 3:
            maintainenceStatusCount.overdue += o.count
            break
        case 5:
            genealogyStatusCount.overdue += o.count
            break
        }
    })
    archiveResult.map((a) => {
        switch (a.reasonId) {
        case 3:
            maintainenceStatusCount.archived += a.count
            break
        case 5:
            genealogyStatusCount.archived += a.count
            break
        }
    })
    return { genealogy: genealogyStatusCount, maintainence: maintainenceStatusCount }
}

exports.getAllPriorityCount = async (statusResult, queryStatus) => {
    let status
    if (queryStatus) {
        status = queryStatus === '1' ? 'Open' : queryStatus === '2' ? 'InProgress' : queryStatus === '3' ? 'Closed' : queryStatus === '4' ? 'Declined' : queryStatus === '5' ? 'Overdue' : queryStatus === '6' ? 'Archived' : queryStatus === '7' ? 'All' : null
    }
    let priorityObj = { high: 0, medium: 0, low: 0 }
    statusResult.map(s => {
        switch (Number(s.priority)) {
        case 1:
            priorityObj.high += s.count
            break
        case 2:
            priorityObj.medium += s.count
            break
        case 3:
            priorityObj.low += s.count
            break
        default:
            break
        }
    })
    return { status: status, counts: priorityObj }
}
