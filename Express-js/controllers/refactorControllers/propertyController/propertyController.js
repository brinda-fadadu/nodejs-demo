const PayerController = require('./../paymentController/payerController')
const models = require('../../../models')
const Sequelize = require('sequelize')
const moment = require('moment')
const Op = Sequelize.Op
const logger = require('../../../lib/logger')
class PropertyController {
    constructor (agreementId) {
        this.agreementId = agreementId
    }

    get STATUSES () {
        return {
            RESERVED: 'reserved',
            CONFIRMED: 'confirmed'
        }
    }
    /**
     * @param {number} propertyId - id of the property
     */
    setPropertyId (propertyId) {
        this.propertyId = propertyId
    }

    /**
   * check is property is exist
   */
    async checkProperty (transaction) {
        try {
            this.property = await models.Property.findOne(
                {
                    where: { id: this.propertyId }
                },
                { transaction: transaction }
            )
            if (!this.property) {
                throw new Error('PROPERTY_NOT_FOUND')
            }
            return this.property
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
   * get reservation status
   * @param {string} reservationStatus
   * @param {*}mtransaction
   */
    async getReservationStatus (reservationStatus, transaction) {
        const agreementProperty = await models.AgreementItem.findOne(
            {
                where: { resourceId: this.propertyId, resourceType: 'Property' }
            },
            { transaction: transaction }
        )

        if (reservationStatus !== 'reserved' && !agreementProperty) {
            throw new Error('RESERVATION_NOT_FOUND')
        }
        return agreementProperty
    }

    /**
   * to reserve propery
   * @param {Object} reqBody
   * @param {String} reqBody.resourceType
   * @param {String} reqBody.reservationStatus
   * @param {Object} user - currently logged in user
   * @param {number} user.id - id of the currently logged in user
   */
    async reserveProperty (reqBody, user) {
        const transaction = await models.sequelize.transaction()
        try {
            await this.checkProperty(transaction)
            const payerController = new PayerController()
            payerController.setResource(this.agreementId)
            await payerController.loadResource(transaction)
            const existingReservation = await this.getReservationStatus(
                reqBody.reservationStatus,
                transaction
            )
            if (existingReservation) {
                throw new Error('PROPERTY_UNAVAILABLE')
            }
            const agreementItem = await models.Agre.create({
                agreementId: this.agreementId,
                resourceId: this.propertyId,
                resourceType: reqBody.resourceType,
                price: this.property.price,
                quantity: 1,
                tax: 0,
                reservationStatus: reqBody.reservationStatus,
                createdBy: user.id,
                updatedBy: user.id
            })
            await transaction.commit()
            return agreementItem
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    /**
     * to confirm property
     * @param {Object} reqBody
     * @param {string} reqBody.reservationStatus
     * @param {Object} user - currently logged in user details
     * @param {number} user.id - id of the currently logged in user
     */
    async confirmProperty (reqBody, user) {
        const transaction = await models.sequelize.transaction()
        try {
            await this.checkProperty(transaction)
            const payerController = new PayerController()
            payerController.setResource(this.agreementId)
            await payerController.loadResource(transaction)
            const agreementProperty = await this.getReservationStatus(
                reqBody.reservationStatus,
                transaction
            )
            if (agreementProperty.reservationStatus !== this.STATUSES['RESERVED']) {
                throw new Error('PROPERTY_NOT_RESERVED')
            }

            const otherGardenProperties = await models.AgreementItem.findAll({
                where: {
                    agreementId: this.agreementId,
                    reservationStatus: this.STATUSES['CONFIRMED']
                },
                include: [
                    {
                        model: models.Property,
                        as: 'property',
                        where: {
                            propertyGardenId: {
                                [Op.ne]: this.property.propertyGardenId
                            }
                        }
                    }
                ]
            })

            const result = await models.AgreementItem.update(
                {
                    reservationStatus: this.STATUSES['CONFIRMED'],
                    price: Number(Number(this.property.total).toFixed(2)),
                    updatedBy: user.id
                },
                {
                    where: {
                        id: agreementProperty.id
                    },
                    transaction: transaction
                }
            )
            if (otherGardenProperties.length) {
                await models.AgreementItem.update({ deletedAt: moment().format('YYYY/MM/DD HH:mm:ss'), deletedBy: user.id }, {
                    where: {
                        id: otherGardenProperties.map(x => x.id)
                    },
                    transaction: transaction
                })
            }
            await transaction.commit()
            return result
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    /**
   * to release propery
   * @param {number} userId - id of the currently logged in user
   */
    async releaseProperty (userId) {
        const transaction = await models.sequelize.transaction()
        try {
            await this.checkProperty(transaction)
            const payerController = new PayerController()
            payerController.setResource(this.agreementId)
            await payerController.loadResource(transaction)
            const agreementProperty = await this.getReservationStatus(transaction)
            const result = await models.AgreementItem.update({ deletedAt: moment().format('YYYY/MM/DD HH:mm:ss'), deletedBy: userId },
                {
                    where: {
                        id: agreementProperty.id
                    }
                },
                { transaction: transaction }
            )
            await transaction.commit()
            return result
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }
    async reviewProperties () {
        try {
            const selections = `
                props.id,
                props.name,
                props.price,
                props.ecfAmount,
                props.total,
                props.propertyItemCode,
                props.lotSellUnitId,
                pc.name AS propertyCampus,
                props.propertyGardenId,
                pg.name AS propertyGarden,
                agmtProps.reservationStatus,
                0 AS maxRights,
                0 AS rights
            `

            const buildQuery = selections => `
                SELECT
                ${selections}
                FROM
                [Property] AS props
                INNER JOIN [PropertyGarden] AS pg ON pg.id = props.propertyGardenId
                INNER JOIN [PropertyCampus] AS pc ON pc.id = pg.propertyCampusId
                INNER JOIN [PropertyType] AS pt ON pt.id = props.propertyTypeCodeId
                LEFT OUTER JOIN [AgreementProperty] AS agmtProps ON agmtProps.propertyId = props.id
                WHERE agmtProps.reservationStatus IN ('reserved', 'confirmed')AND agmtProps.agreementId = ${this.agreementId}
            `
            const result = await models.sequelize.query(`
                ${buildQuery(selections)}
            `)

            return result[0]
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * to fetch list of properties
     * @param {Object} query
     * @param {number} query.limit
     * @param {number} query.page
     * @param {number} query.agreementId
     * @param {number} query.propertyTypeId
     * @param {number} query.propertyCampusId
     * @param {number} query.propertyGardenId
     * @param {number} query.minPrice
     * @param {number} query.maxPrice
     */
    static async fetchListOfPropertys (query) {
        let limit = query.limit || 25
        let offset = query.page ? (Number(query.page) - 1) * limit : 0
        let filteringConditions = `agmtProps.reservationStatus IS NULL`
        if (query.agreementId) {
            filteringConditions = `(agmtProps.reservationStatus IS NULL OR (agmtProps.agreementId=${query.agreementId} AND agmtProps.reservationStatus='reserved'))`
        }
        if (query.propertyTypeId) {
            let propertyTypeIds = query.propertyTypeId.map(a => Number(a))
            filteringConditions =
        filteringConditions +
        ` AND props.propertyTypeCodeId IN (${propertyTypeIds.join(', ')})`
        }
        if (query.propertyCampusId) {
            filteringConditions =
        filteringConditions +
        ` AND pg.propertyCampusId = ${query.propertyCampusId}`
        }
        if (query.propertyGardenId) {
            let propertyGardenIds = query.propertyGardenId.map(a => Number(a))
            filteringConditions =
        filteringConditions +
        ` AND props.propertyGardenId IN (${propertyGardenIds.join(', ')})`
        }
        // if (query.maxRights) {
        //     filteringConditions = filteringConditions + ` AND int_rights.maxRights = ${query.maxRights}`
        // }
        if (query.minPrice) {
            filteringConditions =
        filteringConditions + ` AND props.total >= ${query.minPrice}`
        }
        if (query.maxPrice) {
            filteringConditions =
        filteringConditions + ` AND props.total <= ${query.maxPrice}`
        }
        try {
            const selections = `
                props.id,
                props.name,
                props.price,
                props.ecfAmount,
                props.total,
                props.propertyItemCode,
                props.lotSellUnitId,
                pc.name AS propertyCampus,
                pg.name AS propertyGarden,
                agmtProps.reservationStatus,
                0 AS maxRights,
                0 AS rights
            `

            const buildQuery = selections => `
                SELECT
                ${selections}
                FROM
                [Property] AS props
                INNER JOIN [PropertyGarden] AS pg ON pg.id = props.propertyGardenId
                INNER JOIN [PropertyCampus] AS pc ON pc.id = pg.propertyCampusId
                INNER JOIN [PropertyType] AS pt ON pt.id = props.propertyTypeCodeId
                LEFT OUTER JOIN [AgreementProperty] AS agmtProps ON agmtProps.propertyId = props.id
                WHERE
                ${filteringConditions}
            `
            const result = await models.sequelize.query(`
                ${buildQuery(selections)}
                ORDER BY props.id
                OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
            `)

            const metaQuery = await models.sequelize.query(`
                ${buildQuery('COUNT(props.id) AS count')}
            `)

            return {
                properties: result[0],
                meta: metaQuery[0][0].count
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    static async fetchListOfPropertyCampusesWithGardens () {
        try {
            const result = await models.PropertyCampus.findAll({
                include: [
                    {
                        model: models.PropertyGarden,
                        as: 'propertyGardens'
                    }
                ]
            })
            return result
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    static async fetchListOfPropertyTypes () {
        try {
            const result = await models.PropertyType.findAll({})
            return result
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
}

module.exports = PropertyController
