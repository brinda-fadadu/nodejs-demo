const models = require('../../../models')
const ReasonController = require('./reasonController')
const AnController = require('./anController')
const { upsert } = require('../utils')
const logger = require('../../../lib/logger')
class GenealogyController extends ReasonController {
    /**
     *
     * @param {Object<{reasons: Array}>} data
     * @param {Array<{Object}} data.reasons is array of objects which has the details of the someOneHasPassed and the related persons like decedent
     * @param {Object} createdCall object of the call created to which the reason should be associated to
     * @param {*} transaction
     */
    static async createOrUpdate (data, createdCall, transaction) {
        try {
            const updatedReasons = []
            const userId = data.userId
            for (const reason of data.reasons) {
                let genealogyObj = {
                    ...reason,
                    callId: createdCall.id
                }
                if (!reason.isDeleted) {
                    reason.decedent.userId = userId
                    let decedent = await AnController._createOrUpdateDecedent(reason.decedent, transaction)
                    let relationId = await this.addOrGetRelation(reason.callerDecedentRelation, transaction)
                    genealogyObj.decedentId = decedent.id
                    genealogyObj.callerDecedentRelationId = relationId
                } else {
                    genealogyObj.deletedBy = userId
                    genealogyObj.deletedAt = new Date()
                }
                const upsertedReason = await upsert('GenealogySearchReason', genealogyObj, transaction, { userId })
                updatedReasons.push(upsertedReason)
            }
            data.reasons = updatedReasons
            return data
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     *
     * @param {integer} callId is the id of the call of which we should get the genealogy reason
     * @param {*} transaction
     */
    static getGenealogyOfCall (callId, transaction, scope = { personScope: null }) {
        /**
         * fetching the genealogy search reason of the call if the call is created with the genealogy reason
         */
        return models.GenealogySearchReason.findAll({
            where: {
                callId,
                deletedAt: null,
                deletedBy: null
            },
            include: [
                {
                    model: models.Person.scope(scope.personScope),
                    as: 'decedent',
                    include: [
                        {
                            model: models.DeathDetails,
                            as: 'deathDetails'
                        }
                    ]
                },
                {
                    model: models.Relation,
                    as: 'callerDecedentRelation'
                }
            ],
            transaction
        })
    }
}
module.exports = GenealogyController
