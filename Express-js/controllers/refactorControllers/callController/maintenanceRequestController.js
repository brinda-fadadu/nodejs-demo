// const CallController = require('./callController')
const ReasonController = require('./reasonController')
const models = require('../../../models')
const { upsert } = require('../utils')
const logger = require('../../../lib/logger')
class MaintenanceRequestController extends ReasonController {
    /**
     *
     * @param {Object<{reasons: Object}>} data is a object with the details of the reason to create
     * @param {Object} createdCall is a object with the details of the call created to qhich the reason should be associated
     * @param {*} transaction
     */
    static async createOrUpdate (data, createdCall, transaction) {
        try {
            const userId = data.userId
            let reqReason = data.reasons
            let maintenanceRequest = {
                /**
                 * basic structure for the maintenance request reason
                 */
                ...reqReason,
                callId: createdCall.id,
                createdBy: userId
            }
            /**
             * creating a maintenance request reason
             */
            const createdMaintenanceRequest = await upsert('MaintenanceRequest', maintenanceRequest, transaction, { userId })

            if (reqReason.cause) {
                /**
                 * if the maintenance request reasons are selected, add them to the MaintenanceRequestReasonType table
                 */
                await this.createMaintenanceRequestCauses(reqReason.cause, createdMaintenanceRequest.id, transaction)
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     *
     * @param {integer} callId is the id of the call to which the reason is associated
     * @param {*} transaction
     */
    static getMaintenanceReasonOfCall (callId, transaction) {
        /**
         * fetching the maintenance request reason of the call (if the reason for the is maintenance request reason)
         */
        return models.MaintenanceRequest.findOne({
            where: {
                callId: callId
            },
            include: [
                /**
                 * including maintenance request reasons
                 */
                {
                    model: models.MaintenanceRequestCause,
                    as: 'maintenanceRequestReasonType'
                }
            ],
            transaction
        })
    }

    static async createMaintenanceRequestCauses (causes, maintenanceRequestId, transaction) {
        await models.MaintenanceRequestCause.destroy({
            where: {
                maintenanceRequestId: maintenanceRequestId
            },
            transaction
        })
        /**
             * adding the maintenanceRequest types if selected
             */
        if (causes.length) {
            let maintenanceTypeArr = causes.map(async ele => {
                return models.MaintenanceRequestCause.create({
                    maintenanceCauseId: ele,
                    maintenanceRequestId: maintenanceRequestId
                }, { transaction })
            })
            await Promise.all(maintenanceTypeArr)
        }
    }
}

module.exports = MaintenanceRequestController
