const models = require('../../models/index')
const logger = require('../../lib/logger')

async function fetchListOfPropertyTypes () {
    try {
        const result = await models.PropertyType.findAll({})
        return result
    } catch (error) {
        let errorMessage = error.message || error
        logger.error(errorMessage)
        throw errorMessage
    }
}

module.exports = exports = fetchListOfPropertyTypes
