const logger = require('../../../lib/logger')
const { upsert } = require('../utils')
const models = require('../../../models')

class FuneralArrangementSectionController {
    /**
     * @param {*} data
     * @param {integer} data.id
     * @param {integer} data.clFacilityLocationId
     * @param {integer} data.serviceLocationId
     * @param {string} data.funeralHomePhone
     * @param {string} data.phone
     * @param {integer} data.funeralDirectorId
     * @param {string} data.instruction
     * @param {array} data.funeralArrangementSectionLocations
     * @param {string} data.funeralArrangementSectionLocations.type values for type is 'viewing', 'visitation1', 'visitation2', 'visitation3', 'reception'
     * @param {string} data.funeralArrangementSectionLocations.location
     * @param {date} data.funeralArrangementSectionLocations.startTime
     * @param {date} data.funeralArrangementSectionLocations.endTime
     * @param {*} transaction
     */
    async upsertFuneralArrangementInfoSection (data, transaction) {
        try {
            const result = await upsert('FuneralArrangementSection', data, transaction)
            if (result) {
                await models.FuneralArrangementSectionLocation.destroy({
                    where: {
                        funeralArrangementSectionId: result.id
                    }
                })
                data.funeralArrangementSectionLocations.map(d => {
                    d.funeralArrangementSectionId = result.id
                })
                await Promise.all(data.funeralArrangementSectionLocations.map(async d => {
                    await upsert('FuneralArrangementSectionLocation', d, transaction)
                }))
            }
            return result
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
}
module.exports = exports = FuneralArrangementSectionController
