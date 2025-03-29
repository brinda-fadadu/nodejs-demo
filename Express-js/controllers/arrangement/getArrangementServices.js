const models = require('../../models')
const seed = require('../../config/seed')

async function getArrangmentServices (arrangementId) {
    //  TODO: Need to do the implementation
    const arrangement = await models.Arrangement.findOne({
        where: {
            id: arrangementId
        }
    })
    if (arrangement) {
        const result = await models.ScheduleService.findAll({
            where: {
                ArrangementId: arrangementId
            },
            include: [{
                model: models.Service,
                attributes: ['id', 'Code', 'Name', 'Description', 'Price', 'TaxRate'],
                IsSchedulingRequired: true
            }],
            attributes: ['id', 'ScheduleId', 'ContractType']
        })
        const data = result.map(ele => {
            ele.ContractType = seed.seed.ContractType[ele.ContractType]
            return ele
        })
        return data
    } else {
        throw new Error('Arrangement not found')
    }
}

module.exports = exports = getArrangmentServices
