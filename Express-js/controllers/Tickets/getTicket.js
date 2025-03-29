const models = require('../../models')
const sequelize = require('sequelize')

exports.getTicketById = async function (ticketId) {
    try {
        const ticket = await models.Ticket.findOne({
            where: {
                TicketId: ticketId
            },
            include: [{
                model: models.Call,
                attributes: ['id', 'Identifier'],
                as: 'Deceded',
                include: [
                    {
                        model: models.GeneologySearchReason,
                        as: 'geneologySearchReason',
                        attributes: ['id'],
                        include: [
                            {
                                model: models.Person,
                                as: 'decedent',
                                attributes: ['id', 'FirstName', 'LastName', 'MiddleName', 'DateOfDeath']
                            }
                        ]
                    },
                    {
                        model: models.MaintenanceRequestReason,
                        as: 'maintenanceRequestReason',
                        attributes: ['id', 'GraveMarkerLocation', 'ServiceLocation', 'CallId'],
                        include: [
                            {
                                model: models.MaintenanceRequestReasonType,
                                as: 'maintenanceRequestReasonType'
                            }
                        ]
                    }
                ]
            },
            ...createUserInclude('assignedTo', ['id', 'Name']),
            ...createUserInclude('createdBy', ['id', 'Name']),
            ...createUserInclude('updatedBy', ['id', 'Name']),
            ...createUserInclude('ownedBy', ['id', 'Name']),
            {
                model: models.TicketHistories,
                as: 'ticketHistory',
                attributes: ['id', 'TicketId', 'DueDate', 'Comment', 'Status', 'Priority', 'AssignedTo', 'Description', 'CreatedBy', 'ArchivedAt', 'CreatedAt', 'UpdatedAt'],
                include: [
                    ...createUserInclude('ticketHistoryAssignedTo', ['id', 'name']),
                    ...createUserInclude('ticketHistoryCreatedBy', ['id', 'name'])
                ],
                group: [sequelize.fn('date_trunc', 'date', sequelize.col('updatedAt'))]
            }],
            order: [
                [{ model: models.TicketHistories, as: 'ticketHistory' }, 'UpdatedAt', 'DESC']]
        })
        return ticket
    } catch (err) {
        console.log(err)
        throw err
    }
}

function createUserInclude (asTerm, attributesList) {
    try {
        return [
            {
                model: models.User,
                as: asTerm,
                attributes: attributesList
            }
        ]
    } catch (err) {
        console.log(err)
        throw err
    }
}
