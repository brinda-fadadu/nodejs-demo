const models = require('../../../models')
const ReasonController = require('./reasonController')
const { upsert } = require('../utils')
const logger = require('../../../lib/logger')
class OtherRequestController extends ReasonController {
    /**
     *
     * @param {Object} data is a object with the data of the reason to be created
     * @param {*} createdCall is a object of the data of the created call to which the reason should be associated
     * @param {*} transaction
     */
    static async createOrUpdate (data, createdCall, transaction) {
        try {
            let reqReason = data.reasons
            const userId = data.userId
            let otherReason = {
                ...reqReason,
                callId: createdCall.id,
                createdBy: userId
            }
            /**
             * adding the other reason
             */
            const otherRequest = await upsert('OtherRequest', otherReason, transaction, { userId })

            if (reqReason.followUpTypes) {
                /**
                 * adding the other reason follow ups if selected
                 */
                await this.createOtherRequestFollowUps(reqReason.followUpTypes, reqReason.isFollowUpRequired, otherRequest.id, transaction)
            }
            return otherRequest
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     *
     * @param {integer} callId is the id of the call to which the reason is associated to
     * @param {*} transaction
     */
    static getOtherRequestOfCall (callId, transaction) {
        /**
         * fetching the other request reason of the call if the reason for the call is other request
         */
        return models.OtherRequest.findOne({
            where: {
                callId: callId
            },
            include: [
                {
                    /**
                     * including other reason follow ups table
                     */
                    model: models.OtherRequestFollowUp,
                    as: 'otherRequestFollowUps',
                    include: [{
                        model: models.FollowUpType
                    }]
                }
            ],
            transaction
        })
    }

    static async createOtherRequestFollowUps (followUps, isFollowUpRequired, otherRequestId, transaction) {
        await models.OtherRequestFollowUp.destroy({
            where: {
                otherRequestId
            },
            transaction
        })
        /**
             * adding the other reason follow ups if selected
             */
        if (followUps.length && isFollowUpRequired) {
            let otherRequestReasonsArr = followUps.map(async ele => {
                /**
                     * adding the other reason followups for the other reason
                     */
                return models.OtherRequestFollowUp.create({
                    followUpTypeId: ele,
                    otherRequestId
                }, { transaction })
            })
            await Promise.all(otherRequestReasonsArr)
        }
    }
}

module.exports = OtherRequestController
