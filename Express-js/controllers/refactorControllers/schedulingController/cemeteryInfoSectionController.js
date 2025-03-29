const logger = require('../../../lib/logger')
const { upsert } = require('../utils')

class CemeteryInfoSectionController {
    async upsertCemeteryInfoSection (data, transaction) {
        try {
            const result = await upsert('CemeteryInformationSection', data, transaction)
            return result
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
}
module.exports = exports = CemeteryInfoSectionController
