const logger = require('../../../lib/logger')
const { upsert } = require('../utils')

class GenericSectionController {
    /**
     * @param {*} data
     * @param {integer} data.id
     * @param {boolean} data.isLocationVerifiedWithFamily
     * @param {boolean} data.isLocationVerifiedWithPlattedRecord
     * @param {boolean} data.isElectronicCIF
     * @param {boolean} data.reviewedTrustStatement
     * @param {boolean} data.confirmedExpectedMerchandiseDelivery
     * @param {boolean} data.confirmedPlacementScheduleWithFuneralDirector
     * @param {boolean} data.isPermitted
     * @param {boolean} data.isWitnessedCremation
     * @param {integer} data.noOfWitness
     * @param {string} data.instruction
     * @param {*} transaction
     */
    async upsertGenericSection (data, transaction) {
        try {
            const result = await upsert('GenericSection', data, transaction)
            return result
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
}
module.exports = exports = GenericSectionController
