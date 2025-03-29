const logger = require('../../../lib/logger')
const { upsert } = require('../utils')

class MerchandiseInfoSectionController {
    /**
     * @param {*} data
     * @param {integer} data.id
     * @param {boolean} data.isVasesSelected
     * @param {integer} data.noOfVases
     * @param {string} data.instruction
     * @param {*} transaction
     */
    async upsertMerchandiseInfoSection (data, transaction) {
        try {
            const result = await upsert('MerchandiseAdditionalInfoSection', data, transaction)
            return result
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
}
module.exports = exports = MerchandiseInfoSectionController
