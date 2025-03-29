const models = require('../../models/index')
const logger = require('../../lib/logger')
const loweringFirstLetter = require('../../utils/loweringFirstLetter')
const { seed } = require('../../config/seed')

async function getServicesHandler (page, limit) {
    try {
        const serviceCount = await models.Service.count({})
        const services = await models.Service.findAll({
            attributes: {
                exclude: ['CreatedAt', 'UpdatedAt']
            },
            limit: limit,
            offset: (page - 1) * limit
        })
        const servicesRes = services.map((eachService) => {
            eachService = loweringFirstLetter(eachService)
            eachService.contractType = seed.ContractType[eachService.contractType]
            return eachService
        })
        return { serviceCount, servicesRes }
    } catch (error) {
        let errorMessage
        errorMessage = error.message || error
        logger.error(errorMessage)
        throw errorMessage
    }
}

module.exports = exports = getServicesHandler
