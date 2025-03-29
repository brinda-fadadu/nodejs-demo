// const CallController = require('./callController')
const models = require('../../../models')
const PersonController = require('../personController/personController')
const AddressController = require('../addressController/addressController')
const ReasonController = require('./reasonController')
const { upsert } = require('../utils')
const _ = require('lodash')

class AnController extends ReasonController {
    /** s
     * @param {Object} decedent has basic details of the person added as the decedent
     * @param {Object<{address: Object, organization: Object}>} decedent.deathDetails.lor is the object of the details of the location of remains of the decedent
     * @param {Object} caller has the details of the person added as caller to the call
     * @param {*} transaction
     */
    static async _createOrUpdateDecedent (decedent, caller, transaction) {
        decedent.isAlive = false
        const person = await PersonController.createOrUpdate(decedent, decedent.addressPlace, decedent.birthplace, transaction)
        const { dateOfDeath, deceasedStatus, hospitalDeathStatus, certifierId } = decedent.deathDetails || {}
        let certifierObj, certifier
        if (!certifierId && _.get(decedent, 'deathDetails.certifier')) {
            decedent.deathDetails.certifier.certifierPerson.userId = decedent.userId
            const certifierPerson = await PersonController.createOrUpdate(decedent.deathDetails.certifier.certifierPerson, decedent.deathDetails.certifier.certifierPerson.addressPlace, {}, transaction)
            certifierObj = {
                id: certifierId,
                personId: certifierPerson.id,
                licenseNumber: decedent.deathDetails.certifier.licenseNumber.toUpperCase(),
                faxNumber: decedent.deathDetails.certifier.faxNumber
            }
            certifier = await upsert('Certifier', certifierObj, transaction)
        }
        const deathDetailsPayload = {
            certifierId: certifierId || (certifier ? certifier.id : null),
            dateOfDeath,
            deceasedStatus,
            hospitalDeathStatus
        }
        if (_.get(decedent, 'deathDetails.isLORSameAsCallerAddress')) {
            deathDetailsPayload.locationOfRemainId = caller.addressPlaceId
        } else {
            if (!_.isEmpty(_.get(decedent, 'deathDetails.lor'))) {
                const lorPlace = await AddressController.managePlace(decedent.deathDetails.lor, transaction)
                deathDetailsPayload.locationOfRemainId = _.get(lorPlace, 'id')
            }
        }
        const personController = new PersonController(person.id)
        await personController.createOrUpdateDeathDetails(deathDetailsPayload, transaction)
        return person
    }

    /**
     *
     * @param {Object<{reasons: Arrays}>} data
     * @param {Object} createdCall is the object of the created call to which the reason should be associated to
     * @param {Object} caller is the object if the person added as the caller to the call
     * @param {*} transaction
     */
    static async createOrUpdate (data, createdCall, caller, transaction) {
        if (!data || !data.reasons || !data.reasons.length) {
            throw new Error('Invalid AN payload')
        }
        const userId = data.userId
        const updatedReasons = []
        for (const reason of data.reasons) {
            const { id, isReadyForPickup, isCallerNok, funeralHomeChoice, cemeteryHomeChoice,
                haveCemeteryPN, haveFuneralPN, callerDecedentRelation, informantDecedentRelation,
                requiredService, arrangerEmail, isInformantSameAsCaller, isDeleted } = reason
            const callerDecedentRelationId = await this.addOrGetRelation(callerDecedentRelation, transaction)
            const someOnePassedPayload = {
                id,
                callId: createdCall.id,
                isCallerNok,
                arrangerEmail,
                haveFuneralPN,
                haveCemeteryPN,
                requiredService,
                isReadyForPickup,
                funeralHomeChoice,
                cemeteryHomeChoice,
                isInformantSameAsCaller,
                callerDecedentRelationId
            }
            if (!isDeleted) {
                reason.decedent.userId = userId
                const decedent = await this._createOrUpdateDecedent(reason.decedent, caller, transaction)
                someOnePassedPayload.decedentId = decedent.id
                if (isInformantSameAsCaller) {
                    someOnePassedPayload.informantId = createdCall.callerId
                    someOnePassedPayload.informantDecedentRelationId = callerDecedentRelationId
                } else {
                    reason.informant.userId = userId
                    const informantDecedentRelationId = await this.addOrGetRelation(informantDecedentRelation, transaction)
                    someOnePassedPayload.informantDecedentRelationId = informantDecedentRelationId
                    const informant = await PersonController.createOrUpdate(
                        reason.informant, reason.informant.addressPlace, reason.informant.birthPlace, transaction
                    )
                    someOnePassedPayload.informantId = informant.id
                }
            } else {
                someOnePassedPayload.deletedBy = userId
                someOnePassedPayload.deletedAt = new Date()
            }
            const upsertedReason = await upsert('SomeOnePassed', someOnePassedPayload, transaction, userId)
            upsertedReason.familyArranger = reason.familyArranger
            updatedReasons.push(upsertedReason)
        }
        data.reasons = updatedReasons
        return data
    }

    /**
     *
     * @param {string} callId is the id of the call using which we fetch the someOneHasPassed reason associated to the call
     * @param {*} transaction
     */
    static getAnReasonOfCall (callId, transaction, scope = { personScope: ['withPlace', 'withVerificationDetails'] }) {
        return models.SomeOnePassed.scope('withVerificationDetails').findAll({
            where: {
                callId,
                deletedBy: null,
                deletedAt: null
            },
            include: [
                {
                    // including the relation table to get the caller relation to decedent
                    model: models.Relation,
                    as: 'callerDecedentRelation'
                }, {
                    // including the relation table to get the informant relation to the decedent
                    model: models.Relation,
                    as: 'informantDecedentRelation'
                }, {
                    // including the relation table to get the informant relation to the decedent
                    model: models.FamilyArranger,
                    as: 'familyArranger'
                }
            ],
            transaction
        })
    }

    /**
     *
     * @param {array} toDeleteReasons is an array of the objects with the ids of the reason to delete
     * @param {*} transaction
     */
    static async deleteAnReasons (toDeleteReasons, transaction) {
        const deletedReasons = toDeleteReasons.map(async reason => {
            return models.SomeOnePassed.destroy({
                where: {
                    id: reason.id
                },
                transaction,
                cascade: true
            })
        })
        await Promise.all(deletedReasons)
    }
}

module.exports = AnController
