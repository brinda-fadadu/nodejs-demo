const models = require('../../models/index')
const logger = require('../../lib/logger')
const loweringFirstLetter = require('../../utils/loweringFirstLetter')
const { seed } = require('../../config/seed')

async function fetchMerchandise (page, limit) {
    try {
        const merchandiseCount = await models.Item.count({
            include: [
                {
                    model: models.ItemCategory,
                    where: {
                        Name: 'Merchandise Item'
                    }
                }
            ]
        })
        const merchandise = await models.Item.findAll({
            attributes: {
                exclude: ['IsDisabled', 'CreatedAt', 'UpdatedAt']
            },
            include: [
                {
                    model: models.ItemCategory,
                    attributes: [],
                    where: {
                        Name: 'Merchandise Item'
                    }
                }
            ],
            limit: limit,
            offset: (page - 1) * limit
        })
        const merchandiseRes = merchandise.map((eachMerchandise) => {
            eachMerchandise = loweringFirstLetter(eachMerchandise)
            eachMerchandise.contractType = seed.ContractType[eachMerchandise.contractType]
            return eachMerchandise
        })
        return { merchandiseCount, merchandiseRes }
    } catch (error) {
        let errorMessage
        errorMessage = error.message || error
        logger.error(errorMessage)
        throw errorMessage
    }
}

module.exports = exports = fetchMerchandise
