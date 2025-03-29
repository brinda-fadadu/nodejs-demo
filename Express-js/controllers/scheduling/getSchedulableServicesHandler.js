const models = require('../../models')
const logger = require('../../lib/logger')

exports.getSchedulableServicesHandler = async function (personId) {
    try {
        const result = await models.ScheduleService.findAll({
            where: { personId, archivedAt: null },
            attributes: ['id', 'statementLocationItemId'],
            include: [{
                model: models.StatementLocationItem,
                as: 'StatementLocationItems',
                attributes: ['id', 'locationItemId', 'statementId'],
                include: [
                    {
                        model: models.Statement,
                        as: 'StatementDetails',
                        attributes: ['id', 'contractNumber', 'agreementType']
                    }, {
                        model: models.LocationItem,
                        as: 'LocationItemDetails',
                        attributes: ['id', 'itemId'],
                        include: [
                            {
                                model: models.Item,
                                as: 'ItemDetails',
                                attributes: ['id', 'serviceType'],
                                include: [{
                                    model: models.ServiceType,
                                    as: 'ItemServiceType'
                                }]
                            }
                        ]
                    }
                ]
            }, {
                model: models.FuneralServiceSchedule,
                as: 'ScheduledFuneralServices'
            }]
        })
        return getFinalOutCome(result)
    } catch (err) {
        logger.error(`Error while fetching schedulable services from database ${err}`)
        throw err
    }
}

function getFinalOutCome (data) {
    const finalData = data.map(d => {
        const obj = {
            serviceType: d.StatementLocationItems.LocationItemDetails.ItemDetails.ItemServiceType.name,
            description: '', // todo: need to add description field in servicetype model
            agreementType: d.StatementLocationItems.StatementDetails.agreementType,
            scheduledServiceId: d.id,
            statementId: d.StatementLocationItems.StatementDetails.id,
            statementNumber: d.StatementLocationItems.StatementDetails.contractNumber,
            statementLocationItemId: d.StatementLocationItems.id,
            missingAlternateAgreement: false,
            isScheduled: !!d.ScheduledFuneralServices
        }
        return obj
    })
    return { 'schedulableServices': finalData }
}
