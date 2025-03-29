const models = require('../../../models')
const logger = require('../../../lib/logger')

class ServiceController {
    /**
     *
     * @param {Number} decedentId
     * @param {Object<{name: String, description: String, note: String, faaId: String}>} data
     */
    static async saveInterestedService (decedentId, data, transaction) {
        try {
            if (!decedentId) {
                throw new Error('INVALID_DECEDENT_ID')
            }
            if (!data.name) {
                throw new Error('INVALID_SERVICE_NAME')
            }
            if (!data.description) {
                throw new Error('INVALID_SERVICE_DESCIPTION')
            }

            let newServiceObj = {
                personId: decedentId,
                serviceName: data.name,
                serviceDescription: data.description,
                notes: data.note,
                faaId: data.faaId
            }
            let service = await models.FAAService.findOne({
                where: {
                    personId: decedentId,
                    notes: data.note,
                    faaId: data.faaId
                }
            })
            if (service) {
                throw new Error('INTEREST_ALREADY_SAVED')
            } else {
                newServiceObj = await models.FAAService.create(newServiceObj, { transaction })
            }
            return {
                newServiceObj
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     *
     * @param {Object<{onePortalId: String}>} queryObj
     */
    static async getInterestedServices (queryObj) {
        try {
            if (!queryObj.onePortalId) {
                throw new Error('INVALID_ONE_PORTAL_ID')
            }
            const decedent = await models.PersonVerificationDetails.findOne({
                where: queryObj
            })
            const services = await models.FAAService.findAll({
                where: {
                    personId: decedent.personId
                },
                attributes: ['id', 'serviceName', 'serviceDescription', 'notes']
            })
            return {
                services
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
}

module.exports = ServiceController
