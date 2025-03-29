const _ = require('underscore')
const moment = require('moment-timezone')
const Op = require('sequelize').Op
const logger = require('../../../lib/logger')
const models = require('../../../models')

class ChapelController {
    /**
     * Fetch list of chapels based on provided inputs
     * user story: ccs-6642
     * @param {*} queryObj includes chapeltype: chapel/crematory, locationId: selected location id, chapelId: selected chapel id
     */
    static async getListOfChapels (queryObj) {
        try {
            if (queryObj && queryObj.chapelType) {
                let chapelQuery = {}
                if (queryObj.locationId) {
                    chapelQuery.locationId = queryObj.locationId
                }
                if (queryObj.chapelId) {
                    chapelQuery.id = queryObj.chapelId
                }
                const chapelResult = await models.ChapelType.findOne({
                    where: { name: queryObj.chapelType },
                    attributes: ['id'],
                    include: [{
                        model: models.ChapelTypeChapel,
                        attributes: ['id'],
                        include: [{
                            model: models.Chapel,
                            where: chapelQuery,
                            include: [{
                                model: models.Location,
                                as: 'location',
                                attributes: ['id', 'name']
                            }, {
                                model: models.Place,
                                as: 'place',
                                attributes: ['id'],
                                include: [{
                                    model: models.Address,
                                    as: 'address'
                                }]
                            }]
                        }]
                    }]
                })
                if (chapelResult) {
                    return _.pluck(chapelResult.ChapelTypeChapels, 'Chapel').map(eachChapel => {
                        return {
                            id: eachChapel.id,
                            name: eachChapel.name,
                            location: eachChapel.location,
                            address: eachChapel.place ? eachChapel.place.address : null
                        }
                    })
                } else {
                    throw new Error('CHAPELS_NOT_FOUND_FOR_GIVEN_CHAPELTYPE_OR_LOCATION_ID')
                }
            } else {
                throw new Error('CHAPEL_TYPE_IS_REQUIRED')
            }
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    /**
     * Fetching availability of selected chapel
     * user story: ccs-6643
     * @param {*} queryObj includes chapelId: selected chapel id, chapelDate: selected date, startTime: start time of chapel, endTime: end time of chapel
     * startTime and endTime in query params should have +5:30 added to selected startTime and endTime while requesting this api
     */
    static async getAvailabilityOfChapel (queryObj) {
        try {
            if (queryObj && queryObj.startTime && queryObj.endTime && queryObj.chapelId && queryObj.chapelDate) {
                const st = queryObj.startTime
                const et = queryObj.endTime
                const result = await models.ReservedResource.findAll({
                    where: {
                        [Op.and]: [
                            {
                                resourceType: 'Chapel',
                                resourceId: queryObj.chapelId,
                                [Op.and]: [
                                    { reservationDate: { [Op.gte]: moment(queryObj.chapelDate).tz(queryObj.timezone).startOf('day') } },
                                    { reservationDate: { [Op.lte]: moment(queryObj.chapelDate).tz(queryObj.timezone).endOf('day') } }
                                ],
                                [Op.or]: [
                                    { blockStartTime: { [Op.eq]: st } },
                                    { blockEndTime: { [Op.eq]: et } },
                                    {
                                        [Op.and]: [
                                            { blockStartTime: { [Op.lte]: st } },
                                            { blockEndTime: { [Op.gte]: st } }
                                        ]
                                    }, {
                                        [Op.and]: [
                                            { blockStartTime: { [Op.lte]: et } },
                                            { blockEndTime: { [Op.gte]: et } }
                                        ]
                                    }, {
                                        [Op.and]: [
                                            { blockStartTime: { [Op.gt]: st } },
                                            { blockEndTime: { [Op.lt]: et } }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                })
                let availability
                if (result && result.length) {
                    if (queryObj.reservedChapelId) {
                        result.map(r => {
                            if (r.id === Number(queryObj.reservedChapelId)) {
                                availability = true
                            } else {
                                availability = false
                            }
                        })
                    } else {
                        availability = false
                    }
                } else {
                    availability = true
                }
                return { availability }
            } else {
                throw new Error('REQUIRED_PARAMETERS_MISSING')
            }
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
}
module.exports = exports = ChapelController
