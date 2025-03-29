const _ = require('lodash')
const models = require('../../../models')
const logger = require('../../../lib/logger')
const WebcemController = require('../webCemController/webCemController')
const ObituaryController = require('./obituaryController')
const CallFaa = require('../../../routes/familyPortal/callFaa')

class ScheduleSyncController {
    constructor (personId) {
        this.personId = personId
    }

    async updatePersonToFAA (transaction) {
        try {
            const person = await models.Person.scope('withDeathDetails', 'withVerificationDetails').findOne({
                where: {
                    id: this.personId
                },
                attributes: [
                    'id',
                    'prefix',
                    'firstName',
                    'lastName',
                    'middleName',
                    'phoneNumber',
                    'email',
                    'gender',
                    'isVerified',
                    'isAlive',
                    'suffix',
                    'dateOfBirth',
                    'pictureUrl'
                ],
                transaction
            })
            let result
            if (person) {
                result = person.toJSON()
                result = {
                    ...result,
                    dateOfDeath: _.get(person, 'deathDetails.dateOfDeath'),
                    onePortalId: _.get(person, 'personVerificationDetails.onePortalId')
                }
                delete result.deathDetails
                delete result.personVerificationDetails

                await CallFaa.syncDecedent(person.id, result)
            }
            return result
        } catch (err) {
            logger.info(err)
        }
    }

    async updateCremationServices () {
        try {
            const opi = await ObituaryController.getOnePortalId(this.personId)
            const result = await WebcemController.fetchDecedentDetails(opi)
            if (result && this.personId) {
                delete result.contacts
                delete result.agreements
                delete result.military
                delete result.genealogy

                await CallFaa.syncCemetery(this.personId, {
                    onePortalId: opi,
                    ...result
                })
            }
            return result
        } catch (err) {
            logger.info(err)
        }
    }
}

module.exports = ScheduleSyncController
