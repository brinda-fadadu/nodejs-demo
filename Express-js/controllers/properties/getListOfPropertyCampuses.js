const models = require('../../models/index')
const logger = require('../../lib/logger')

async function fetchListOfPropertyCampusesWithGardens () {
    try {
        const result = await models.PropertyCampuses.findAll({
            include: [
                {
                    model: models.PropertyGarden,
                    as: 'propertyGardens'
                }
            ]
        })
        return result
    } catch (error) {
        let errorMessage = error.message || error
        logger.error(errorMessage)
        throw errorMessage
    }
}

module.exports = exports = fetchListOfPropertyCampusesWithGardens
