const PersonController = require('../personController/personController')
const models = require('../../../models')
const ReasonController = require('./reasonController')
const { upsert } = require('../utils')
const logger = require('../../../lib/logger')
class PnController extends ReasonController {
    /**
     *
     * @param {Object<{reasons: Arrays}>} data
     * @param {Object} createdCall is the object of the created call to which the reason should be associated to
     * @param {*} transaction
     */
    static async createOrUpdate (data, createdCall, transaction) {
        try {
            const updatedReasons = []
            for (const reason of data.reasons) {
                let preNeedObj = {
                    ...reason,
                    callId: createdCall.id
                }
                const userId = data.userId
                if (!reason.isDeleted) {
                    if (reason.isBeneficiarySameAsCaller) {
                        preNeedObj.beneficiaryId = createdCall.callerId
                        preNeedObj.callerBeneficiaryRelationId = await this.addOrGetRelation({ name: 'Self' }, transaction)
                    } else {
                        preNeedObj.callerBeneficiaryRelationId = await this.addOrGetRelation(reason.relation, transaction)
                        // reason.beneficiary.isAlive = true
                        reason.beneficiary.userId = userId
                        const beneficiary = await PersonController.createOrUpdate(
                            reason.beneficiary, reason.beneficiary.addressPlace, reason.beneficiary.birthPlace, transaction
                        )
                        preNeedObj.beneficiaryId = beneficiary.id
                    }
                } else {
                    preNeedObj.deletedBy = userId
                    preNeedObj.deletedAt = new Date()
                }
                // creating the pre arrangement reason
                const upsertedReason = await upsert('PreArrangement', preNeedObj, transaction, { userId })
                updatedReasons.push(upsertedReason)
            }
            data.reasons = updatedReasons
            return data
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    static getPnReasonOfCall (callId, transaction, scope = { personScope: ['withPlace', 'withVerificationDetails'] }) {
        return models.PreArrangement.findAll({
            where: {
                callId: callId,
                deletedAt: null,
                deletedBy: null
            },
            include: [
                {
                    // including the relation table to get the caller relation to beneficary
                    model: models.Relation,
                    as: 'callerBeneficiaryRelation'
                },
                {
                    // including the person table as beneficiary to get the beneficiary details
                    model: models.Person.scope(scope.personScope),
                    as: 'beneficiary'
                }
            ],
            transaction
        })
    }
}

module.exports = PnController
