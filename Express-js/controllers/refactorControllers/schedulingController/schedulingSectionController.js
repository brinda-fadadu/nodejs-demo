const logger = require('../../../lib/logger')
const { upsert } = require('../utils')
const _ = require('underscore')
const moment = require('moment')
const models = require('../../../models')
const ChapelController = require('../chapelController/chapelController')
const WorkOrderController = require('../workOrderController/workOrderController')

class SchedulingSectionController {
    async upsertSchedulingSection (data, scheduledFuneralServiceId, userId, timezone, transaction, fromWO) {
        try {
            if (data.date && data.beginningTime && data.endingTime && !(moment(data.endingTime).format('YYYY/MM/DD HH:mm:ss')) > (moment(data.beginningTime).format('YYYY/MM/DD HH:mm:ss'))) {
                throw new Error('SCHEDULING_ENDING_TIME_MUST_BE_GREATERTHAN_SCHEDULING_BEGINNING_TIME')
            }
            let getSchedulingSection
            if (data.id) {
                getSchedulingSection = await models.SchedulingSection.findOne({ where: { id: data.id } })
                if (getSchedulingSection) {
                    if (
                        (moment(getSchedulingSection.date).format('YYYY/MM/DD HH:mm:ss') !== moment(data.date).format('YYYY/MM/DD HH:mm:ss')) ||
                        (moment(getSchedulingSection.beginningTime).format('YYYY/MM/DD HH:mm:ss') !== moment(data.beginningTime).format('YYYY/MM/DD HH:mm:ss')) ||
                        (moment(getSchedulingSection.endingTime).format('YYYY/MM/DD HH:mm:ss') !== moment(data.endingTime).format('YYYY/MM/DD HH:mm:ss'))
                    ) {
                        // TODO: call work order function to change the status as unassigned. --Venu
                        logger.info(`Moving work order to unAssigned status`)
                        if (scheduledFuneralServiceId) {
                            await WorkOrderController.removeWorkOrderScheduleAndResources(scheduledFuneralServiceId, 'ScheduledFuneralService', userId, transaction, true, fromWO)
                        }
                        logger.info(`Moving work order to unAssigned status -- done`)
                    }
                } else {
                    throw new Error('SCHEDULING_SECTION_DETAILS_NOT_FOUND')
                }
            }
            let reservedChapelResult
            if (!_.isEmpty(data.reservedChapel)) {
                if (!data.reservedChapel.id) {
                    const chapelInput = {
                        resourceType: 'Chapel',
                        resourceId: data.reservedChapel.chapelId,
                        reservationDate: data.reservedChapel.reservationDate,
                        startTime: data.reservedChapel.startTime,
                        endTime: data.reservedChapel.endTime,
                        blockStartTime: moment(data.reservedChapel.startTime).tz(timezone).subtract(30, 'minutes'),
                        blockEndTime: moment(data.reservedChapel.endTime).tz(timezone).add(30, 'minutes')
                    }
                    const fetchAvailabilityOfChapel = await ChapelController.getAvailabilityOfChapel({
                        chapelId: chapelInput.resourceId,
                        startTime: chapelInput.startTime,
                        endTime: chapelInput.endTime,
                        timezone: timezone,
                        chapelDate: chapelInput.reservationDate,
                        reservedChapelId: getSchedulingSection ? getSchedulingSection.reservedChapelId : null
                    })
                    if (fetchAvailabilityOfChapel.availability === true) {
                        if (data.id && getSchedulingSection && getSchedulingSection.reservedChapelId) {
                            // removing the pervious reserved Resource of this Scheduling
                            await models.ReservedResource.destroy({ where: { id: getSchedulingSection.reservedChapelId } })
                        }
                        reservedChapelResult = await upsert('ReservedResource', chapelInput, transaction)
                    } else {
                        throw new Error('CHAPEL_NOT_AVIALABLE_FOR_REQUESTED_SLOT')
                    }
                }
            } else {
                if (data.id && getSchedulingSection && getSchedulingSection.reservedChapelId) {
                    // removing the pervious reserved Resource of this Scheduling
                    await models.ReservedResource.destroy({ where: { id: getSchedulingSection.reservedChapelId } })
                }
            }
            const reservedChapelId = reservedChapelResult ? reservedChapelResult.id : ((data.reservedChapel && data.reservedChapel.id) ? data.reservedChapel.id : null)
            const schedulingSectionInput = {
                id: data.id,
                date: data.date,
                beginningTime: data.beginningTime,
                endingTime: data.endingTime,
                clFacilityLocationId: data.clFacilityLocationId || null,
                serviceLocationId: data.serviceLocationId,
                reservedChapelId: _.isEmpty(data.reservedChapel) ? null : reservedChapelId,
                cremationType: data.cremationType,
                graveSideReason: data.graveSideReason
            }
            const result = await upsert('SchedulingSection', schedulingSectionInput, transaction)
            return result
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
}
module.exports = exports = SchedulingSectionController
