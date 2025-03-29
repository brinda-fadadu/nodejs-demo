const logger = require('../../lib/logger')
const models = require('../../models/index')

async function getAdditionalInfo (personId) {
    try {
        const info = await models.SomeOnePassed.findOne({
            attributes: [
                'haveFuneralPN', 'haveCemeteryPN', 'funeralHomeChoice', 'cemeteryHomeChoice'
            ],
            where: {
                decedentId: personId
            },
            order: [['id', 'DESC']]
        })
        if (!info) {
            throw new Error('Person id not found')
        }
        return info
    } catch (error) {
        let errorMessage
        errorMessage = error.message || error
        logger.error(errorMessage)
        throw errorMessage
    }
}

module.exports = exports = getAdditionalInfo
