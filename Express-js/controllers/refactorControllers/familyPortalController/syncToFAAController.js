const logger = require('../../../lib/logger')
const CallFaa = require('../../../routes/familyPortal/callFaa')

class SyncToFAAController {
    /**
     *
     * @param {Object<{decedentId: Number, userId: Number, decedent: Object}>} queryObj
     */
    static async pullFromFAA (decedentId) {
        try {
            if (!decedentId) {
                throw new Error('INVALID_DECEDENT_ID')
            }

            await CallFaa.syncDataToFAA(decedentId)

            return {
                message: 'OK'
            }
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
}

module.exports = SyncToFAAController
