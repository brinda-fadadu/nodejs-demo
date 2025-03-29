const logger = require('../../../lib/logger')
const { upsert } = require('../utils')
const models = require('../../../models')

class SubServicesSectionController {
    async upsertSubServicesSection (data, sfsId, transaction) {
        try {
            await models.SubServiceSection.destroy({
                where: {
                    scheduledFuneralServiceId: sfsId
                }
            })
            data.map(d => {
                d.scheduledFuneralServiceId = sfsId
            })
            await Promise.all(data.map(async d => {
                await upsert('SubServiceSection', d, transaction)
            }))
            return true
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
}
module.exports = exports = SubServicesSectionController
