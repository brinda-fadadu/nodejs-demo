const _ = require('lodash')
const models = require('../../../models')
const faaWorker = require('../../../workers/faa_worker/CallFaaWorker')
const logger = require('../../../lib/logger')
const { upsert } = require('../utils')

class InvitationController {
    constructor (id) {
        this.id = id
    }

    /**
     * @param {Object<{onePortalId: String}>} queryObj
     * @param {Object<{firstName: String, lastName: String, email: String, secondaryEmail: String}>} data
     */
    static async sendInvitation (queryObj, data, caseArranger) {
        let transaction = await models.sequelize.transaction()
        try {
            if (!queryObj.onePortalId) {
                throw new Error('INVALID_ONE_PORTAL_ID')
            }
            if (!data.firstName) {
                throw new Error('INVALID_FIRST_NAME')
            }
            if (!data.lastName) {
                throw new Error('INVALID_LAST_NAME')
            }
            if (!data.email) {
                throw new Error('INVALID_EMAIL')
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

            let oldArrangerEmail = _.get(familyArranger, 'email')
            familyArranger = await this.createOrUpdateFamilyArranger(data, familyArranger, person, transaction)
            await this.callFaaWorker(familyArranger, oldArrangerEmail, {
                ...data,
                id: _.get(person, 'id'),
                fromEmail: _.get(caseArranger, 'email'),
                fromName: _.get(caseArranger, 'name')
            }, transaction)

            await transaction.commit()
            return ({
                message: 'OK'
            })
        } catch (err) {
            await transaction.rollback()
            logger.error(err)
            throw err
        }
    }

    /**
     * @param {Number} decedentId
     * @param {Object<{firstName: String, lastName: String, email: String, secondaryEmail: String}>} data
     * @param {*} transaction
     */
    static async sendInvitationPreVerification (decedentId, data, caseArranger, transaction) {
        try {
            if (!decedentId) {
                throw new Error('INVALID_DECEDENT_ID')
            }
            if (!data.firstName) {
                throw new Error('INVALID_FIRST_NAME')
            }
            if (!data.lastName) {
                throw new Error('INVALID_LAST_NAME')
            }
            if (!data.email) {
                throw new Error('INVALID_EMAIL')
            }

            let familyArranger = await models.FamilyArranger.findOne({
                where: { decedentId },
                transaction
            })

            let oldArrangerEmail = _.get(familyArranger, 'email')
            familyArranger = await this.createOrUpdateFamilyArranger(data, familyArranger, { id: decedentId }, transaction)
            await this.callFaaWorker(familyArranger, oldArrangerEmail, {
                ...data,
                id: decedentId,
                fromEmail: _.get(caseArranger, 'email'),
                fromName: _.get(caseArranger, 'name')
            }, transaction)
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    static async createOrUpdateFamilyArranger (reqData, familyArranger, person, transaction) {
        const {
            firstName,
            lastName,
            email,
            secondaryEmail
        } = reqData

        let familyArrangerObj = {
            firstName,
            lastName,
            email,
            secondaryEmail
        }

        if (!_.get(familyArranger, 'id')) {
            familyArrangerObj = {
                ...familyArrangerObj,
                isFaaInvitationSent: false,
                decedentId: _.get(person, 'id'),
                onePortalId: _.get(person, 'personVerificationDetails.onePortalId')
            }
        } else {
            familyArrangerObj = {
                ...familyArrangerObj,
                id: _.get(familyArranger, 'id')
            }
        }

        familyArranger = await upsert('FamilyArranger', familyArrangerObj, transaction)
        return familyArranger
    }

    static async callFaaWorker (familyArranger, oldArrangerEmail, data, transaction) {
        const {
            firstName,
            lastName,
            email,
            secondaryEmail,
            fromEmail,
            fromName,
            locationCode
        } = data

        // Check and send if old email is present
        let oldEmail
        if (oldArrangerEmail !== _.get(familyArranger, 'email')) {
            oldEmail = oldArrangerEmail
        } else {
            oldEmail = _.get(familyArranger, 'email')
        }

        // Job to call FAA send-invitation API
        faaWorker.addQueue({ firstName, lastName, email, secondaryEmail, oldEmail, fromEmail, fromName, locationCode, personId: data.id, faaWorker_event: 'sendInvitation' })

        // Mark isFaaInvitaionSent as TRUE
        await models.FamilyArranger.update({
            isFaaInvitationSent: true
        }, {
            where: { id: familyArranger.id },
            transaction
        })
    }
}

module.exports = InvitationController
