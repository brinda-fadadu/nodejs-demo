const logger = require('../../../lib/logger')
const { upsert } = require('../utils')

class IntermentRequestSectionController {
    /**
     * @param {*} data
     * @param {integer} data.id
     * @param {boolean} data.isWitnessLoweringOrEntombment
     * @param {boolean} data.isWitnessCoveringOrSealings
     * @param {boolean} data.isWitnessFilling
     * @param {boolean} data.isReopenBottom
     * @param {boolean} data.isBurningPot
     * @param {boolean} data.isMoundOfDirtByFootend
     * @param {boolean} data.isUseOfTent
     * @param {boolean} data.isPlaceAndNotify
     * @param {boolean} data.isReopenTop
     * @param {*} transaction
     */
    async upsertIntermentRequestSection (data, transaction) {
        try {
            const result = await upsert('IntermentRequestSection', data, transaction)
            return result
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
}
module.exports = exports = IntermentRequestSectionController
