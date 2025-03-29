const logger = require('../../../lib/logger')
const { upsert } = require('../utils')
const moment = require('moment')
const models = require('../../../models')
const WorkOrderController = require('../workOrderController/workOrderController')

class DisIntermentInfoSectionController {
    /**
     * @param {*} data
     * @param {integer} data.id
     * @param {integer} data.propertyId for now null
     * @param {date} data.beginningTime
     * @param {date} data.endingTime
     * @param {string} data.disintermentReason
     * @param {string} data.disintermentType values 'fullbody', 'crematedremains'
     * @param {string} data.instruction
     * @param {integer} scheduledCemeteryServiceId
     * @param {integer} userId
     * @param {*} transaction
     */
    async upsertDisintermentSection (data, scheduledCemeteryServiceId, userId, transaction, fromWO = false) {
        try {
            if (data.endingTime && data.beginningTime) {
                if ((moment(data.endingTime).format('YYYY/MM/DD HH:mm:ss')) > (moment(data.beginningTime).format('YYYY/MM/DD HH:mm:ss'))) {
                    // TODO: void cemetery work order -- venu
                    if (data.id) {
                        const getSchedulingSection = await models.DisintermentInfoSection.findOne({ where: { id: data.id } })
                        if (getSchedulingSection) {
                            if (
                                (moment(getSchedulingSection.beginningTime).format('YYYY/MM/DD HH:mm:ss') !== moment(data.beginningTime).format('YYYY/MM/DD HH:mm:ss')) ||
                                (moment(getSchedulingSection.endingTime).format('YYYY/MM/DD HH:mm:ss') !== moment(data.endingTime).format('YYYY/MM/DD HH:mm:ss'))
                            ) {
                                // TODO: call work order function to change the status as unassigned. --Venu
                                logger.info(`Moving work order to unAssigned status`)
                                if (scheduledCemeteryServiceId) {
                                    await WorkOrderController.removeWorkOrderScheduleAndResources(scheduledCemeteryServiceId, 'ScheduledCemeteryService', userId, transaction, true, fromWO)
                                }
                                logger.info(`Moving work order to unAssigned status -- done`)
                            }
                        } else {
                            throw new Error('SCHEDULING_SECTION_DETAILS_NOT_FOUND')
                        }
                    }
                    const result = await upsert('DisintermentInfoSection', data, transaction)
                    if (data.propertyId && data.propertyId.length) {
                        let disintermentInfoSectionId = result.id
                        // Bulk Insert Properties when multiselected
                        let properties = data.propertyId.map(e => {
                            return { disintermentInfoSectionId, propertyId: e }
                        })
                        await models.CemeteryScheduledProperty.bulkCreate(properties, {
                            transaction
                        })
                    }
                    return result
                } else {
                    throw new Error('DISINTERMENT_ENDING_TIME_MUST_BE_GREATERTHAN_SCHEDULING_BEGINNING_TIME')
                }
            }
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
}
module.exports = exports = DisIntermentInfoSectionController
