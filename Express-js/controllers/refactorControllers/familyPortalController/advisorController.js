const _ = require('lodash')
const models = require('../../../models')
const logger = require('../../../lib/logger')

class AdvisorController {
    /**
     *
     * @param {Object<{onePortalId: String}>} queryObj
     */
    static async getFamilyAdvisor (queryObj) {
        try {
            if (!queryObj.onePortalId) {
                throw new Error('INVALID_ONE_PORTAL_ID')
            }

            let person = await models.Person.findOne({
                include: [{
                    model: models.PersonVerificationDetails,
                    as: 'personVerificationDetails',
                    attributes: ['onePortalId'],
                    where: queryObj
                }]
            })

            if (!person) {
                throw new Error('DECEDENT_NOT_FOUND')
            }

            let familyArranger = await models.FamilyArranger.findOne({
                where: {
                    decedentId: _.get(person, 'id')
                }
            })

            return familyArranger ? {
                firstName: _.get(familyArranger, 'firstName'),
                lastName: _.get(familyArranger, 'lastName'),
                email: _.get(familyArranger, 'email'),
                secondaryEmail: _.get(familyArranger, 'secondaryEmail'),
                isFaaInvitationSent: _.get(familyArranger, 'isFaaInvitationSent')
            } : {}
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
}

module.exports = AdvisorController
