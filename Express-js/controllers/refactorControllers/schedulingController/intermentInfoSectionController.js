const logger = require('../../../lib/logger')
const { upsert } = require('../utils')
const Op = require('sequelize').Op
const moment = require('moment')
const models = require('../../../models')
const WorkOrderController = require('../workOrderController/workOrderController')

class IntermentInfoSectionController {
    /**
     * @param {*} data
     * @param {integer} data.id
     * @param {integer} data.propertyId for now null
     * @param {date} data.beginningTime
     * @param {date} data.endingTime
     * @param {integer} data.temporaryBurialLocationId for now null
     * @param {integer} data.temporaryDisintermentLocationId for now null
     * @param {string} data.memorialInformation
     * @param {boolean} data.isPreburied
     * @param {integer} scheduledCemeteryServiceId
     * @param {integer} userId
     * @param {*} transaction
     */
    async upsertIntermentSection (data, scheduledCemeteryServiceId, userId, transaction, fromWO = false) {
        try {
            if (data.endingTime && data.beginningTime && !(moment(data.endingTime).format('YYYY/MM/DD HH:mm:ss')) > (moment(data.beginningTime).format('YYYY/MM/DD HH:mm:ss'))) {
                throw new Error('INTERMENT_ENDING_TIME_MUST_BE_GREATERTHAN_SCHEDULING_BEGINNING_TIME')
            } else {
                // TODO: void cemetery work order -- venu
                if (data.id) {
                    const getSchedulingSection = await models.IntermentInformationSection.findOne({ where: { id: data.id } })
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
                const result = await upsert('IntermentInformationSection', data, transaction)
                let intermentInfoSectionId = result.id
                // Bulk Insert Properties when multiselected
                if (data.propertyId && data.propertyId.length) {
                    let properties = data.propertyId.map(e => {
                        return { intermentInfoSectionId, propertyId: e }
                    })
                    await models.CemeteryScheduledProperty.bulkCreate(properties, {
                        transaction
                    })
                }
                return result
            }
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    static async unselectProperty (propertyIds, transaction) {
        const res = await models.CemeteryScheduledProperty.update({
            intermentInfoSectionId: null
        }, {
            where: {
                propertyId: { [Op.in]: propertyIds }
            },
            transaction
        })
        return res
    }
}
module.exports = exports = IntermentInfoSectionController
