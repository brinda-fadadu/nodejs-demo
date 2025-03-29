const models = require('../../../models')
const Op = require('sequelize').Op
const moment = require('moment')
const _ = require('lodash')
const fs = require('fs')
const https = require('https')
const util = require('util')
const AdmZip = require('adm-zip')
const realpath = util.promisify(fs.realpath)
const unlink = util.promisify(fs.unlink)
const generatePDF = require('../../../utils/generatePDF/generatePDF')
const logger = require('../../../lib/logger')
const AgreementItemPriceController = require('./agreementItemPriceController')
const AddendumController = require('./addendum')
const SideBySidePropertyController = require('./sideBySideProperty')
const AgreementPropertyAdditionalRights = require('./agreementPropertyAdditionalRights')
const ChangeLogController = require('./changeLog')
const ReservationController = require('./propertyReservationTypeController')
const ApprovalsController = require('../adjustmentController/approvalsController')
const ItemUsageController = require('../itemUsageController/itemUsageController')
const { getKey, getNameOfPerson } = require('../../../lib/util')
const { seed } = require('../../../config/seed')
const { upsert, getAgreementRoles, certificateOfSepulcherCondition, getAssetsPathForCertOfSepulcher } = require('../utils')
const FinanceController = require('../financeController/financeOptionController')
const UploadFileController = require('../uploadFileController/uploadFileController')
const UserController = require('../userController')
const STATUSES = {
    RESERVED: 'reserved',
    CONFIRMED: 'confirmed'
}

class PropertyController {
    constructor (agreementId) {
        this.agreementId = agreementId
    }

    static get PROPERTIES_ASSIGNED_STATUS () {
        return {
            Sold: 'S',
            Unsold: 'U',
            SoldUnassigned: 'SU'
        }
    }

    /**
     * Fetch the list of Properties
     * @param {Object} query is the query params object of the request
     * @param {number} query.page is the page you want to show the results in
     * @param {number} query.limit is the number of results you want to show in a page
     * @param {number} query.agreementId is the id of the agreement with which you want to filter the properties
     * @param {number} query.propertyTypeId is the id of the type of the property with which you want to filter the properties
     * @param {number} query.propertyCampusId is the id of the campus of the property with which you want to filter the properties
     * @param {number} query.propertyGardenId is the id of the garden of the property  with which you want to filter the properties
     * @param {number} query.minPrice is the max price with which you want to filter the properties
     * @param {number} query.maxPrice is the min price with which you want to filter the properties
     */
    static async fetchListOfProperties (query) {
        let limit = query.limit || 25
        let offset = query.page ? (Number(query.page) - 1) * limit : 0
        let campusFilter = ``
        let filteringConditions = ` props.id NOT IN (SELECT propertyId FROM AgreementProperty WHERE deletedAt IS NULL) ` // Changed because of added deletedAt recently by Parul
        if (query.agreementId) {
            const AgreementController = require('./agreementController')
            const propertyController = new PropertyController(query.agreementId)
            const agreement = await propertyController.getAgreement()
            const locationId = _.get(agreement, 'locationId', null)
            const type = _.get(agreement, 'type', null)
            if (type === AgreementController.TYPES['Cemetry']) {
                campusFilter = `AND pc.locationId = ${locationId}`
            }
        }
        if (query.propertyTypeId) {
            let propertyTypeIds = query.propertyTypeId.map(a => Number(a))
            filteringConditions = filteringConditions + ` AND pt.id IN (${propertyTypeIds.join(', ')})`
        }
        if (query.propertyCampusId) {
            filteringConditions = filteringConditions + ` AND pg.propertyCampusId = ${query.propertyCampusId}`
        }
        if (query.propertyGardenId) {
            let propertyGardenIds = query.propertyGardenId.map(a => Number(a))
            filteringConditions = filteringConditions + ` AND props.propertyGardenId IN (${propertyGardenIds.join(', ')})`
        }
        // if (query.maxRights) {
        //     filteringConditions = filteringConditions + ` AND int_rights.maxRights = ${query.maxRights}`
        // }
        if (query.minPrice) {
            filteringConditions = filteringConditions + ` AND props.total >= ${query.minPrice}`
        }
        if (query.maxPrice) {
            filteringConditions = filteringConditions + ` AND props.total <= ${query.maxPrice}`
        }
        try {
            const selections = `
                DISTINCT props.id,
                props.name,
                props.price,
                props.ecfAmount,
                props.total,
                props.pnDiscountValue,
                props.preDevelopedDiscountValue,
                props.preDeveloped,
                props.pnPropertyDiscount,
                props.propertyItemCode,
                props.lotSellUnitId,
                pc.name AS propertyCampus,
                pg.name AS propertyGarden,
                pt.name AS propertyType,
                CASE WHEN pt.name = 'Grave'
                    THEN 1
                    ELSE
                    ISNULL(itr.rights,0)
                    END AS rights,
                CASE WHEN pt.name = 'Grave' THEN 4 ELSE
                    ISNULL(itr.maxRights,0) END AS maxRights,
                CASE WHEN pt.name = 'Grave'  THEN 1 ELSE
                ISNULL(itr.graves,0) END AS graves,
                itr.graves,
                itr.rights,
                itr.maxRights
            `

            const buildQuery = selections => `
                SELECT
                ${selections}
                FROM
                [Property] AS props
                INNER JOIN [PropertyGarden] AS pg ON pg.id = props.propertyGardenId
                INNER JOIN [PropertyCampus] AS pc ON pc.id = pg.propertyCampusId ${campusFilter}
                INNER JOIN [PropertyTypeCode] AS ptc ON ptc.id = props.propertyTypeCodeId
                INNER JOIN [PropertyType] AS pt ON pt.id = ptc.propertyTypeId
                LEFT OUTER JOIN [IntermentRights] AS itr ON itr.propertyCampusId=pc.id AND itr.propertyTypeId=pt.id
                WHERE itr.graves = (CASE WHEN pt.name = 'Grave' THEN 1 ELSE itr.graves END ) AND
                ${filteringConditions} AND props.status = '${PropertyController.PROPERTIES_ASSIGNED_STATUS['Unsold']}'
            `

            console.log(`
            ${buildQuery(selections)}
            ORDER BY props.id
            OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
        `)
            const result = await models.sequelize.query(`
                ${buildQuery(selections)}
                ORDER BY props.name
                OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
            `)
            const metaQuery = await models.sequelize.query(`
                ${buildQuery('COUNT(DISTINCT props.id) AS count')}
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

    /**
     * Fetch list of PropertyCampuses with Property Gardens
     */
    async fetchListOfPropertyCampusesWithGardens () {
        try {
            const AgreementController = require('./agreementController')
            let campusWhere = {}
            if (this.agreementId) {
                const agreement = await this.getAgreement()
                const locationId = _.get(agreement, 'locationId', null)
                const type = _.get(agreement, 'type', null)
                if (locationId && type === AgreementController.TYPES['Cemetry']) {
                    campusWhere.locationId = locationId
                }
            }
            const result = await models.PropertyCampus.findAll({
                include: [
                    {
                        model: models.PropertyGarden,
                        as: 'propertyGardens'
                    }
                ],
                where: campusWhere
            })
            return result
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * Fetch list of Property Types
     */
    static async fetchListOfPropertyTypes () {
        try {
            const result = await models.PropertyType.findAll({})
            return result
        } catch (error) {
            logger.error(error)
            let errorMessage = error.message || error
            throw errorMessage
        }
    }

    /**
     * Fetch the Agreement Details
     */
    async getAgreement () {
        const agreement = await models.Agreement.findOne({
            where: { id: this.agreementId },
            include: [
                {
                    model: models.SaleType,
                    as: 'saleType',
                    required: false
                }
            ]
        })

        if (!agreement) {
            throw new Error('STATEMENT_NOT_FOUND')
        }

        return agreement
    }

    /**
     * Fetch the Property Details
     * @param {*} propertyId is the id of the property of which the details needs to be fetched
     * @param {*} transaction is the transaction object for DB
     */
    async getProperty (propertyId, transaction) {
        const property = await models.Property.findOne({
            where: { id: propertyId },
            include: [{
                model: models.PropertyTypeCode,
                as: 'propertyTypeCode'
            }],
            transaction
        })

        if (!property) {
            throw new Error('PROPERTY_NOT_FOUND')
        }

        return property
    }

    /**
     * Fetch the Reservation Status Details
     * @param {*} agrmntPropertyId is the id of the agreement property
     * @param {*} propertyId is the id of the property
     * @param {*} reservationStatus is the status of the property
     */
    async getReservation (agrmntPropertyId, propertyId, reservationStatus) {
        const conditions = {
            propertyId,
            deletedAt: null,
            deletedBy: null
        }

        if (agrmntPropertyId) {
            conditions.id = agrmntPropertyId
        }

        const agreementProperty = await models.AgreementProperty.findOne({
            where: conditions
        })

        if (reservationStatus !== 'reserved' && !agreementProperty) {
            throw new Error('RESERVATION_NOT_FOUND')
        }

        return agreementProperty
    }

    /**
     * Fetch the Primary Beneficiary Details
     */
    async getPurchaser () {
        const agreementRoles = await getAgreementRoles('map')
        const purchaser = await models.AgreementPerson.findOne({
            where: {
                agreementId: this.agreementId,
                roleId: agreementRoles['Purchaser']
            }
        })

        if (!purchaser) {
            throw new Error('PURCHASER_NOT_FOUND')
        }
    }

    /**
     * Reserve the Property
     * @param {*} propertyId is the id of the property
     * @param {*} user is the current user logged in
     * @param {*} reservationStatus is the status of the property
     */
    async reserveProperty (propertyId, user, reservationStatus, addendumId, apiType) {
        const agreement = await this.getAgreement()
        await this.getProperty(propertyId)
        if (apiType !== 'quotation') {
            await this.getPurchaser()
        }
        let inProgressAddendum
        const addendumController = new AddendumController(this.agreementId)
        inProgressAddendum = await addendumController.getInProgressAddendum()
        // Fetch existing property to check
        if (!addendumId) {
            addendumId = null
            if (agreement.status === 'Submitted' && (!inProgressAddendum || !addendumId)) {
                throw new Error('AGREEMENT_ALREADY_COMPLETED')
            }
        } else {
            if (!inProgressAddendum || addendumId !== inProgressAddendum.id) {
                throw new Error('ADDENDUM_ALREADY_COMPLETED')
            }
        }

        const existingReservation = await this.getReservation(null, propertyId, reservationStatus)
        if (existingReservation) {
            throw new Error('PROPERTY_UNAVAILABLE')
        }

        const reservationController = new ReservationController(this.agreementId)
        const { reservationType, expiryDate } = await reservationController.getReservationType()
        try {
            // Insert Statement property here.
            const agreementProperty = await models.AgreementProperty.create({
                agreementId: this.agreementId,
                propertyId,
                addendumId,
                reservationStatus: STATUSES.RESERVED,
                reservationType,
                reservedDate: moment().format(),
                expiryDate: expiryDate,
                createdBy: user.id,
                updatedBy: user.id
            })
            // sending data to webcem
            const { queueNames, queues } = require('../../../appQueues')
            const webCemQueue = queues[queueNames.webCemQueue]
            const webCemData = {
                event: 'property.save',
                agreementId: this.agreementId,
                propertyId,
                userId: user.id
            }
            webCemQueue.add('webCemQueue', webCemData)
            return agreementProperty
        } catch (error) {
            logger.error(error)
            let errorMessage = error.message || error
            throw errorMessage
        }
    }

    /**
     * Release the Property
     * @param {*} propertyId is the id of the property
     */
    async releaseProperty (propertyId, user, addendumId) {
        try {
            let agmnt = await this.getAgreement()
            await this.getProperty(propertyId)
            const agreementProperty = await this.getReservation(null, propertyId)

            const finalResult = await models.sequelize.transaction(async (t) => {
                return this._releasePropertyMainFunctionality(agreementProperty, agmnt, propertyId, user, t, addendumId)
            })

            // sending data to webcem
            const { queueNames, queues } = require('../../../appQueues')
            const webCemQueue = queues[queueNames.webCemQueue]
            const webCemData = {
                event: 'property.save',
                agreementId: this.agreementId,
                propertyId,
                userId: _.get(user, 'id', '')
            }
            webCemQueue.add('webCemQueue', webCemData)

            return finalResult
        } catch (error) {
            logger.error(error)
            let errorMessage = error.message || error
            throw errorMessage
        }
    }

    async _releasePropertyMainFunctionality (agreementProperty, agmnt, propertyId, user, t, addendumId) {
        let AdjustmentsController = require('../adjustmentController/discountsAndAdjustmentsHandler')
        let adjCtrl = new AdjustmentsController()
        let financeController = new FinanceController(this.agreementId)
        if (agreementProperty.reservationStatus === STATUSES.CONFIRMED) {
            await ChangeLogController.recordAction('remove', agreementProperty.id, 'AgreementProperty', t)
            // Delete Side by Side Property
            const sideBySidePropertyController = new SideBySidePropertyController(this.agreementId)
            await sideBySidePropertyController.deleteSideBySideWhileRelease([{
                id: agreementProperty.id
            }], user, t)
            // Delete Additional Rights
            const agreementPropertyAdditionalRights = new AgreementPropertyAdditionalRights(this.agreementId, agreementProperty.id)
            await agreementPropertyAdditionalRights.removeAdditionRights(agreementProperty.id, user, t)
        }

        // Checking Item Consumption for Releasing Property
        const consumedProperties = await ItemUsageController.getConsumedItems({
            resourceType: 'AgreementProperty',
            resourceId: agreementProperty.id,
            deletedAt: null,
            deletedBy: null
        }, t)
        if (consumedProperties.length) {
            throw new Error('Property with Right(s) in ‘Used’ status cannot be released')
        }

        // Unselect Item Usage Properties
        await ItemUsageController.unselectPropertiesItemUsage(user.id, [agreementProperty.id], null, t)

        // Deleting Agreement Property
        const result = await models.AgreementProperty.update({
            expiryDate: null,
            deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
            deletedBy: user.id
        }, {
            where: {
                id: agreementProperty.id
            },
            transaction: t
        })
        // Recalculating the agreement adjustment promocode discounts
        await adjCtrl.reCalculatePromoCodeDiscounts(this.agreementId, user.id, t)
        await models.Agreement.updateAndGetTotal(this.agreementId, user.id, t, agreementProperty.addendumId)

        // Removing Property Discounts
        let adjustments = await models.Adjustment.findAll({
            where: { title: { [Op.in]: ['PN Discount', 'Predeveloped Discount', 'Pn Property Discount'] } },
            order: [
                ['id', 'ASC']
            ],
            include: [
                {
                    model: models.AdjustmentType,
                    as: 'adjustmentType',
                    where: { adjustmentType: 'OtherDiscount' }
                }
            ]
        })
        const pnAdj = adjustments.find(e => e.title === 'PN Discount')
        const preDevAdj = adjustments.find(e => e.title === 'Predeveloped Discount')
        const propertyAdj = adjustments.find(e => e.title === 'Pn Property Discount')
        if (!preDevAdj && agmnt.saleType && agmnt.saleType.arrangementType !== Number(getKey(seed.ArrangementType, 'PN'))) {
            throw new Error('Predeveloped Discount Not Found')
        } else if (!pnAdj && agmnt.saleType && agmnt.saleType.arrangementType === Number(getKey(seed.ArrangementType, 'PN'))) {
            throw new Error('PN Discount/Predeveloped Discount Not Found')
        } else if (!propertyAdj && agmnt.saleType && agmnt.saleType.arrangementType === Number(getKey(seed.ArrangementType, 'PN'))) {
            throw new Error('Pn Property Discount Not Found')
        }
        await adjCtrl.deletePropertyAdjustments(agmnt.id, [propertyId], [_.get(pnAdj, 'id', ''), _.get(preDevAdj, 'id', ''), _.get(propertyAdj, 'id', '')], user.id, t)
        await financeController.removeFinanceDiscount(user.id, t)
        return result
    }

    /**
     * Confirm the Property
     * @param {*} propertyId is the id of the property
     * @param {*} reservationStatus is the status of the property
     * @param {*} user is the current user logged in
     */
    async confirmProperty (propertyId, reservationStatus, user, addendumId, apiType) {
        let AdjustmentsController = require('../adjustmentController/discountsAndAdjustmentsHandler')
        let adjCtrl = new AdjustmentsController()
        let agmnt = await this.getAgreement()
        const property = await this.getProperty(propertyId)
        const agreementProperty = await this.getReservation(null, propertyId, reservationStatus)

        if (agreementProperty.reservationStatus !== STATUSES.RESERVED) {
            throw new Error('PROPERTY_NOT_RESERVED')
        }

        let adjustments = await models.Adjustment.findAll({
            where: { title: { [Op.in]: ['PN Discount', 'Predeveloped Discount', 'Pn Property Discount'] } },
            include: [
                {
                    model: models.AdjustmentType,
                    as: 'adjustmentType',
                    where: { adjustmentType: 'OtherDiscount' }
                }
            ]
        })
        const pnAdj = adjustments.find(e => e.title === 'PN Discount')
        const preDevAdj = adjustments.find(e => e.title === 'Predeveloped Discount')
        const propertyAdjustment = adjustments.find(e => e.title === 'Pn Property Discount')

        try {
            // Fetching Other Garden Properties
            const otherGardenProperties = await models.AgreementProperty.findAll({
                where: {
                    agreementId: this.agreementId,
                    reservationStatus: STATUSES.CONFIRMED,
                    deletedAt: null
                },
                include: [
                    {
                        model: models.Property,
                        as: 'property',
                        where: {
                            propertyGardenId: {
                                [Op.ne]: property.propertyGardenId
                            }
                        }
                    },
                    {
                        model: models.AgreementItemPrice,
                        as: 'agreementPropertyPriceDetails'
                    }
                ]
            })

            const finalResult = await models.sequelize.transaction(async (t) => {
                try {
                    // Creating Agreement Item Price Details
                    let agrmntItemPriceData = {
                        quantity: 1,
                        price: Number(property.price).toFixed(2),
                        ecfAmount: Number(property.ecfAmount).toFixed(2)
                    }
                    let agreementItemPriceController = new AgreementItemPriceController()
                    let agreementItemPrice = await agreementItemPriceController.upsertAgreementItemPrice(agrmntItemPriceData, t)

                    // Confirming Property
                    const result = await models.AgreementProperty.update(
                        {
                            reservationStatus: STATUSES.CONFIRMED,
                            agreementItemPriceId: agreementItemPrice.id,
                            updatedBy: user.id
                        }, {
                            where: {
                                id: agreementProperty.id
                            },
                            transaction: t
                        }
                    )

                    // Deleting Other Garden Properties and Agreement Item Price Details
                    if (otherGardenProperties.length) {
                        // Remove Change Log for other garden property
                        for await (let property of otherGardenProperties) {
                            await ChangeLogController.recordAction('remove', property.id, 'AgreementProperty', t)

                            // Delete Additional Rights
                            const agreementPropertyAdditionalRights = new AgreementPropertyAdditionalRights(this.agreementId, property.id)
                            await agreementPropertyAdditionalRights.removeAdditionRights(property.id, user, t)
                            const { queueNames, queues } = require('../../../appQueues')
                            const webCemQueue = queues[queueNames.webCemQueue]
                            const webCemData = {
                                event: 'property.save',
                                agreementId: this.agreementId,
                                propertyId: property.propertyId,
                                userId: user.id
                            }
                            webCemQueue.add('webCemQueue', webCemData)
                        }

                        let otherGardenProps = otherGardenProperties.map(e => e.id)
                        let otherGardenPropIds = otherGardenProperties.map(e => e.property.id)

                        // Checking Item Consumption for Releasing Property
                        const consumedProperties = await ItemUsageController.getConsumedItems({
                            resourceType: 'AgreementProperty',
                            resourceId: { [Op.in]: otherGardenProps },
                            deletedAt: null,
                            deletedBy: null
                        }, t)
                        if (consumedProperties.length) {
                            throw new Error('Property with Right(s) in ‘Used’ status cannot be released')
                        }

                        // Unselect Item Usage Properties
                        await ItemUsageController.unselectPropertiesItemUsage(user.id, otherGardenProps, null, t)

                        // Deleting previous confirmed properties

                        let financeController = new FinanceController(this.agreementId)
                        await financeController.removeFinanceDiscount(user.id, t)

                        await models.AgreementProperty.update({
                            deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                            deletedBy: user.id
                        }, {
                            where: {
                                id: otherGardenProps
                            },
                            transaction: t
                        })
                        // Remove Other Garden Property Adjustments
                        if (!preDevAdj && agmnt.saleType && agmnt.saleType.arrangementType !== Number(getKey(seed.ArrangementType, 'PN'))) {
                            throw new Error('Predeveloped Discount Not Found')
                        } else if (!pnAdj && agmnt.saleType && agmnt.saleType.arrangementType === Number(getKey(seed.ArrangementType, 'PN'))) {
                            throw new Error('PN Discount/Predeveloped Discount Not Found')
                        } else if (!propertyAdjustment && agmnt.saleType && agmnt.saleType.arrangementType === Number(getKey(seed.ArrangementType, 'PN'))) {
                            throw new Error('Pn Property Discount Not Found')
                        }
                        await adjCtrl.deletePropertyAdjustments(agmnt.id, otherGardenPropIds, [pnAdj.id, preDevAdj.id, propertyAdjustment.id], user.id, t)

                        // Soft delete the side by side property
                        const sideBySidePropertyController = new SideBySidePropertyController(this.agreementId)
                        await sideBySidePropertyController.deleteSideBySideWhileRelease(otherGardenProperties, {}, t)
                    }

                    // Recalculating the agreement adjustment promocode discounts
                    await adjCtrl.reCalculatePromoCodeDiscounts(this.agreementId, user.id, t)
                    await models.Agreement.updateAndGetTotal(this.agreementId, user.id, t, agreementProperty.addendumId)
                    await models.Agreement.updateTotalPaidAndDue(this.agreementId, user.id, t)

                    // Applying PN Discount if agreement is PN
                    let adjData = {
                        agreementId: agmnt.id,
                        addendumId: agreementProperty.addendumId,
                        propertyId: property.id,
                        userId: user.id
                    }
                    // Note: for sales app making saleType id optional for calculate discounts
                    if (property.pnDiscountValue && ((agmnt.saleType && agmnt.saleType.arrangementType === Number(getKey(seed.ArrangementType, 'PN'))) || apiType)) {
                        if (!pnAdj) {
                            throw new Error('PN Discount Not Found')
                        }
                        adjData.adjustmentId = pnAdj.id
                        adjData.adjustmentTypeId = pnAdj.adjustmentTypeId
                        adjData.amount = property.pnDiscountValue
                        adjData.title = pnAdj.title
                        adjData.description = 'PN Discount will be applied by default when property is confirmed'
                        await adjCtrl._childMethodToCreateAgreementAdjustment(adjData, t)
                    }
                    if (property.preDeveloped && property.preDevelopedDiscountValue) {
                        if (!preDevAdj) {
                            throw new Error('Predeveloped Discount Not Found')
                        }
                        adjData.adjustmentId = preDevAdj.id
                        adjData.adjustmentTypeId = preDevAdj.adjustmentTypeId
                        adjData.amount = property.preDevelopedDiscountValue
                        adjData.title = preDevAdj.title
                        adjData.description = 'Predeveloped Discount will be applied by default when property is confirmed'
                        await adjCtrl._childMethodToCreateAgreementAdjustment(adjData, t)
                    }
                    // Note: for sales app making saleType id optional for calculate discounts
                    if (property.pnPropertyDiscount && property.pnPropertyDiscount > 0 && ((agmnt.saleType && agmnt.saleType.arrangementType === Number(getKey(seed.ArrangementType, 'PN'))) || apiType)) {
                        if (!propertyAdjustment) {
                            throw new Error('Pn Property Discount Not Found')
                        }
                        adjData.adjustmentId = propertyAdjustment.id
                        adjData.adjustmentTypeId = propertyAdjustment.adjustmentTypeId
                        adjData.amount = property.pnPropertyDiscount
                        adjData.title = propertyAdjustment.title
                        adjData.description = 'Pn Property Discount will be applied by default when property is confirmed'
                        await adjCtrl._childMethodToCreateAgreementAdjustment(adjData, t)
                    }

                    // Add Change Log for the property
                    await ChangeLogController.recordAction('add', agreementProperty.id, 'AgreementProperty', t)

                    return result
                } catch (error) {
                    console.error(error)
                    throw error
                }
            })

            return finalResult
        } catch (error) {
            logger.error(error)
            let errorMessage = error.message || error
            throw errorMessage
        }
    }

    /**
     * Listing Reviewed Properties
     */
    async reviewProperties (query) {
        let statusFilter = `('reserved', 'confirmed')`
        let selections = `
            props.id,
            props.name,
            props.price,
            a.contractNumber AS agreementNumber,
            ad.addendumNumber,
            props.ecfAmount,
            props.total,
            props.pnDiscountValue,
            props.preDevelopedDiscountValue,
            props.pnPropertyDiscount,
            props.propertyItemCode,
            props.lotSellUnitId,
            pc.name AS propertyCampus,
            props.propertyGardenId,
            pg.name AS propertyGarden,
            agrmntProps.reservationStatus,
            agrmntProps.reservationType,
            agrmntProps.expiryDate,
            agrmntProps.id AS agreementPropertyId,
            pt.name AS propertyType,
            CASE WHEN pt.name = 'Grave'
                    THEN 1
                    ELSE
                    ISNULL(itr.rights,0)
                    END AS rights,
                CASE WHEN pt.name = 'Grave' THEN 4 ELSE
                    ISNULL(itr.maxRights,0) END AS maxRights,
                CASE WHEN pt.name = 'Grave'  THEN 1 ELSE
                ISNULL(itr.graves,0) END AS graves,
            ap.status as status,
            ap.requestInformation as requestInformation
        `
        let from = `
            INNER JOIN [PropertyGarden] AS pg ON pg.id = props.propertyGardenId
            INNER JOIN [PropertyCampus] AS pc ON pc.id = pg.propertyCampusId
            INNER JOIN [PropertyTypeCode] AS ptc ON ptc.id = props.propertyTypeCodeId
            INNER JOIN [PropertyType] AS pt ON pt.id = ptc.propertyTypeId

        `
        let extraFilters = ''
        if (query.status && query.status === 'confirmed') {
            statusFilter = `('confirmed')`
        }
        if (query.propertyTypeId) {
            extraFilters = `AND pt.id = ${query.propertyTypeId}`
        }
        try {
            const buildQuery = (selections) => `
                SELECT
                DISTINCT ${selections}
                FROM
                [Property] AS props
                ${from}
                INNER JOIN  [AgreementProperty] AS agrmntProps ON agrmntProps.propertyId = props.id
                INNER JOIN  [Agreement] AS a ON a.id = agrmntProps.agreementId
                LEFT OUTER JOIN [Approval] AS ap ON ap.resourceId = agrmntProps.id AND ap.resourceType = 'AgreementProperty'
                LEFT OUTER JOIN [Addendum] AS ad ON ad.id = agrmntProps.addendumId
                LEFT OUTER JOIN [IntermentRights] AS itr ON itr.propertyCampusId=pc.id AND itr.propertyTypeId=pt.id
                WHERE itr.graves = (CASE WHEN pt.name = 'Grave' THEN 1 ELSE itr.graves END ) AND agrmntProps.reservationStatus IN ${statusFilter}
                    AND agrmntProps.agreementId = ${this.agreementId} ${extraFilters}
                    AND agrmntProps.deletedAt is NULL
            `
            const result = await models.sequelize.query(`
                ${buildQuery(selections)}
                ORDER BY props.name
            `)
            const formattedResult = result[0].map((eachAgreementProperty) => {
                if (_.get(eachAgreementProperty, 'status')) {
                    eachAgreementProperty.status = ApprovalsController.ApprovalStatusStr(eachAgreementProperty.status)
                    eachAgreementProperty.requestInformation = JSON.parse(eachAgreementProperty.requestInformation)
                }
                return eachAgreementProperty
            })
            return formattedResult
        } catch (error) {
            logger.error(error)
            let errorMessage = error.message || error
            throw errorMessage
        }
    }
    /**
     * To list added properties to the agreement
     */
    async getAgreementProperties () {
        try {
            const query = `SELECT  ap.id,
                'properties' AS itemType,
                a.contractNumber AS agreementNumber,
                ad.addendumNumber,
                ap.propertyId,
                aip.unitPrice,
                aip.unitTax,
                aip.totalPrice,
                aip.totalECFAmount,
                aip.totalTax,
                p.name,
                p.propertyItemCode,
                p.ecfAmount,
                p.pnDiscountValue,
                p.preDevelopedDiscountValue,
                p.pnPropertyDiscount,
                p.price,
                p.preDeveloped,
                aip.quantity,
                (SELECT
                    ag.contractNumber AS agreementNumber,
                    ad.addendumNumber,
                    ls.lotSpaceId,
                    ls.id AS id ,
                    aipapar.totalPrice,
                    aipapar.totalTax
                    FROM AgreementPropertyAdditionalRight apar
                    INNER JOIN LotSpace ls ON ls.id = apar.lotSpaceId
                    INNER JOIN Agreement ag ON ag.id = apar.agreementId
                    INNER JOIN AgreementItemPrice aipapar ON aipapar.id = apar.agreementItemPriceId
                    LEFT OUTER JOIN Addendum ad ON ad.id = apar.addendumId
                    WHERE apar.agreementPropertyId = ap.id AND apar.deletedAt IS NULL FOR JSON PATH) as additionalRights
                FROM AgreementProperty ap
                INNER JOIN AgreementItemPrice aip ON ap.agreementItemPriceId=aip.id
                INNER JOIN Property p ON ap.propertyId = p.id
                INNER JOIN Agreement a ON a.id = ap.agreementId
                LEFT OUTER JOIN Addendum ad ON ad.id = ap.addendumId
                WHERE ap.agreementId=:agreementId AND deletedAt IS NULL AND ap.reservationStatus = 'confirmed'`
            const result = await models.sequelize.query(query, {
                replacements: {
                    agreementId: this.agreementId
                },
                type: models.sequelize.QueryTypes.SELECT
            })
            return result.map(ele => {
                ele.additionalRights = ele.additionalRights ? JSON.parse(ele.additionalRights) : []
                return ele
            })
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    /**
     * Returns total interment and Additional Rights information
     * @param {Number} agreementId
     */
    static async getIntermentAndAdditionalRights (agreementId, transaction) {
        try {
            const query = `
            SELECT ISNULL(SUM(ir.rights),0) AS defaultRights,
            ISNULL(SUM(ir.maxRights),0) AS maxRights,
            addtionalRight.additionalRightsCount,
            addtionalRight.totalAdditionalRightsPrice,
            addtionalRight.reservationType
            FROM AgreementProperty ap INNER JOIN Property p ON p.id = ap.propertyId AND deletedAt IS NULL AND deletedBy IS NULL
            INNER JOIN PropertyTypeCode ptc on ptc.id = p.propertyTypeCodeId
            INNER JOIN PropertyType pt ON pt.id = ptc.propertyTypeId
            INNER JOIN PropertyGarden pg ON pg.id = p.propertyGardenId
            INNER JOIN PropertyCampus pc ON pc.id = pg.propertyCampusId
            LEFT OUTER JOIN IntermentRights ir ON ir.propertyTypeId = pt.id AND ir.propertyCampusId=pc.id AND ir.graves = (CASE WHEN pt.name = 'Grave' THEN 1 ELSE ir.graves END )
            cross apply (
                SELECT ISNULL(COUNT(*), 0) AS additionalRightsCount, ISNULL(SUM(aip.totalPrice),0) AS totalAdditionalRightsPrice , ap.reservationType AS reservationType FROM AgreementPropertyAdditionalRight AS  aar
                INNER JOIN AgreementItemPrice aip ON aar.agreementItemPriceId = aip.id
                WHERE aar.agreementId = ap.agreementId AND aar.deletedAt IS NULL
            ) AS addtionalRight

            WHERE ap.agreementId=:agreementId AND ap.reservationStatus = 'confirmed' GROUP BY ap.agreementId, addtionalRight.additionalRightsCount, addtionalRight.totalAdditionalRightsPrice, addtionalRight.reservationType
            `
            const result = await models.sequelize.query(query, {
                replacements: {
                    agreementId: agreementId
                },
                type: models.sequelize.QueryTypes.SELECT,
                transaction
            })
            if (result && result.length) {
                return result[0]
            } else {
                return { }
            }
        } catch (err) {
            throw err
        }
    }

    static async getPropertyOwners (agreementId) {
        const result = await models.Agreement.scope('withAgreementPersons').findOne({
            where: {
                id: agreementId
            }
        })
        let purchaser = result.purchaser
        let coPurchasers = result.coPurchasers
        let ownerNames = []
        if (purchaser) {
            let p = purchaser.person
            ownerNames.push(`${p.firstName} ${p.middleName} ${p.lastName}`)
        }
        if (coPurchasers.length) {
            coPurchasers.map(e => {
                let cp = e.person
                ownerNames.push(`${cp.firstName} ${cp.middleName} ${cp.lastName}`)
            })
        }
        return ownerNames
    }

    async removeItemsOfAgreement (userId, transaction) {
        const SchedulingController = require('../schedulingController/schedulingController')

        /**
         * Get: ItemUsage
         */
        const itemUsageQuery = `SELECT * FROM ItemUsage
            WHERE
            (
                resourceType='AgreementLocationItem'
                AND resourceId IN (
                    SELECT id FROM AgreementLocationItem WHERE agreementId=${this.agreementId} AND deletedAt IS NULL
                )
            ) OR (
                resourceType='AgreementMemorial'
                AND resourceId IN (
                    SELECT id FROM AgreementMemorial WHERE agreementId=${this.agreementId} AND deletedAt IS NULL
                )
            )`
        const itemUsage = await models.sequelize.query(itemUsageQuery, {
            type: models.sequelize.QueryTypes.SELECT,
            replacements: {},
            transaction
        })

        /**
         * Delete: Scheduled Cemetery Services and Work Order
         */
        const schedulesCemeteryServices = await models.ScheduledCemeteryService.findAll({
            where: {
                itemUsageId: itemUsage.map(x => x.id),
                deletedAt: null,
                deletedBy: null
            },
            transaction
        })
        for await (let service of schedulesCemeteryServices) {
            await SchedulingController.deleteScheduledCemeteryServices(service.itemUsageId, userId, 'Asia/Calcutta', transaction)
        }

        /**
         * Delete: Purchase Order and Purchase Order Item
         */
        const purchaseOrderQuery = `SELECT
            *
            FROM PurchaseOrder AS it
            WHERE
            (
                agreementLocationItemId IN (
                    SELECT id FROM AgreementLocationItem WHERE agreementId=${this.agreementId} AND deletedAt IS NULL
                )
            ) OR (
                agreementMemorialId IN (
                    SELECT id FROM AgreementMemorial WHERE agreementId=${this.agreementId} AND deletedAt IS NULL
                )
            )`
        const purchaseOrder = await models.sequelize.query(purchaseOrderQuery, {
            type: models.sequelize.QueryTypes.SELECT,
            replacements: {},
            transaction
        })
        await models.PurchaseOrderItem.update({
            deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
            deletedBy: userId
        }, {
            where: {
                purchaseOrderId: purchaseOrder.map(x => x.id)
            },
            transaction
        })
        await models.PurchaseOrder.update({
            deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
            deletedBy: userId
        }, {
            where: {
                id: purchaseOrder.map(x => x.id)
            },
            transaction
        })

        /**
         * Delete: Item Usage
         */
        const locationItemQuery = `SELECT
            ali.id,
            it.name as itemName,
            ic.name as itemCategory
            FROM AgreementLocationItem ali
            INNER JOIN LocationItem li ON ali.locationItemId = li.id
            INNER JOIN Item i ON li.itemId = i.id
            INNER JOIN ItemCategory ic ON i.itemCategoryId = ic.id
            INNER JOIN ItemType it ON it.id = ic.itemTypeId
            WHERE agreementId=${this.agreementId}`
        const locationItems = await models.sequelize.query(locationItemQuery, {
            type: models.sequelize.QueryTypes.SELECT,
            replacements: {},
            transaction
        })
        const merchandiseItem = _.filter(locationItems, { itemName: 'Merchandises' })
        const itemUsageMerchandise = _.filter(itemUsage, item => {
            return _.includes(merchandiseItem, item.resourceId)
        })
        for await (let item of itemUsageMerchandise) {
            let merchandise = _.find(merchandiseItem, { id: item.resourceId })
            if (merchandise.itemCategory === 'Casket') {
                await models.CasketSection.update({
                    casketId: null,
                    resourceType: null
                }, {
                    where: {
                        casketId: item.id,
                        resourceType: 'ItemUsage'
                    },
                    transaction
                })
            } else if (merchandise.itemCategory === 'Urn') {
                await models.UrnInformationSection.update({
                    urnId: null,
                    resourceType: null
                }, {
                    where: {
                        urnId: item.id,
                        resourceType: 'ItemUsage'
                    },
                    transaction
                })
            } else if (merchandise.itemCategory === 'Vault') {
                await models.VaultSection.update({
                    vaultId: null,
                    resourceType: null
                }, {
                    where: {
                        vaultId: item.id,
                        resourceType: 'ItemUsage'
                    },
                    transaction
                })
            }
        }
        await models.ItemUsage.update({
            deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
            deletedBy: userId
        }, {
            where: {
                id: itemUsage.map(x => x.id),
                deletedAt: null
            },
            transaction
        })

        /**
         * Delete: Location Items
         */
        await models.AgreementLocationItem.update({
            deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
            deletedBy: userId
        }, {
            where: {
                agreementId: this.agreementId
            },
            transaction
        })

        // Updating location item remove action in change logs
        for await (let item of locationItems) {
            await ChangeLogController.recordAction('remove', item.id, 'AgreementLocationItem', transaction)
        }

        /**
         * Delete: Agreement Memorials and AgreeementMemorialItems
         */
        const memorials = await models.AgreementMemorial.findAll({
            where: {
                agreementId: this.agreementId
            },
            transaction
        })

        for await (let memorial of memorials) {
            await models.AgreementMemorialItem.findAll({
                where: {
                    agreementMemorialId: memorial.id
                },
                transaction
            })
            await models.AgreementMemorialItem.update({
                deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                deletedBy: userId
            }, {
                where: {
                    agreementMemorialId: memorial.id
                },
                transaction
            })

            // TO DO: Updating change log for removing agreement memorial (after CCS-7671 implementation)
        //     for await (let item of memorialItems) {
        //         await ChangeLogController.recordAction('remove', item.id, 'AgreementMemorialItem', transaction)
        //     }
        }
        await models.AgreementMemorial.update({
            deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
            deletedBy: userId
        }, {
            where: {
                agreementId: this.agreementId
            },
            transaction
        })
    }

    /**
     * Remove items for unused property
     */
    async removeItems (userId) {
        let transaction
        try {
            transaction = await models.sequelize.transaction()

            // Remove Agreement Items
            await this.removeItemsOfAgreement(userId, transaction)

            // Update Agreement with latest price details
            const agreementData = {
                totalPrice: 0,
                totalTax: 0,
                totalPurchasePrice: 0,
                totalAdjustment: 0,
                totalCashPrice: 0,
                totalPaid: 0,
                due: 0
            }

            await models.Agreement.update(agreementData, {
                where: {
                    id: this.agreementId
                },
                transaction
            })
            await transaction.commit()
        } catch (error) {
            logger.error(error)
            await transaction.rollback()
            throw error
        }
    }

    async filterAgreementPropertyOwnersForCertificateOfSepulcher (agreementPropertyOwners) {
        // Logic for propertyOwners with
        // single cert. sepulcher pdf for multiple properties with same owners
        // individual cert. sepulcher pdf for each property with different owners
        const clonedArr = _.cloneDeep(agreementPropertyOwners)
        const idxToRemoveFromOriginalArr = []

        agreementPropertyOwners.map((item, index) => {
            let ownersLen = item.ownerDetails.length
            let ownerIdArr = item.ownerDetails.map((ownerItem, ownerIndex) => {
                return ownerItem.ownerId
            })
            ownerIdArr.sort(function (a, b) { return a - b })

            let innerPropertyNameArr = [item.name]
            let rightsWithPropertyArr = [item.rightsWithProperty]
            let rightsPurchasedArr = [item.rightsPurchased]
            delete clonedArr[index]
            clonedArr.map((itm, idx) => {
                let ownersInnerLen = itm.ownerDetails.length
                let innerOwnerIdArr = itm.ownerDetails.map((ownerItm, ownerIdx) => {
                    return ownerItm.ownerId
                })
                innerOwnerIdArr.sort(function (a, b) { return a - b })
                if (index !== idx && ownersInnerLen === ownersLen && _.isEqual(ownerIdArr, innerOwnerIdArr)) {
                    innerPropertyNameArr.push(itm.name)
                    item.name = innerPropertyNameArr.join(', ')
                    rightsWithPropertyArr.push(itm.rightsWithProperty)
                    item.rightsWithProperty = rightsWithPropertyArr.reduce((a, b) => a + b, 0)
                    rightsPurchasedArr.push(itm.rightsPurchased)
                    item.rightsPurchased = rightsPurchasedArr.reduce((a, b) => a + b, 0)
                    delete clonedArr[idx]
                    idxToRemoveFromOriginalArr.push(itm.id)
                }
            })
        })

        idxToRemoveFromOriginalArr.map((it) => {
            let foundIndx = agreementPropertyOwners.findIndex(x => _.get(x, 'id') === it)
            if (foundIndx !== -1) {
                delete agreementPropertyOwners[foundIndx]
            }
        })
        return agreementPropertyOwners.filter(Boolean)
    }

    async downloadCertificateOfSepulcherPdfFile (certificateOfSepulcherPdfFileAzureUrl, localFilePath) {
        return new Promise((resolve, reject) => {
            https.get(certificateOfSepulcherPdfFileAzureUrl, async (response) => {
                if (response.statusCode === 200) {
                    try {
                        const fileWriteStream = fs.createWriteStream(localFilePath)
                        response
                            .pipe(fileWriteStream)
                            .on('finish', resolve)
                            .on('error', reject)
                    } catch (e) {
                        reject(e)
                    }
                } else {
                    return reject(new Error('statusCode=' + response.statusCode))
                }
            })
        })
    }

    async downloadCertificateOfSepulcherByDept (reqBody) {
        let { teamId, startDate, endDate, timezone } = reqBody.query
        const uploadFileController = new UploadFileController()

        startDate = moment(startDate).tz(timezone).startOf('day').format()
        endDate = moment(endDate).tz(timezone).endOf('day').format()

        const sepulcherQuery = `SELECT DISTINCT cs.* FROM UserTeam ut
        INNER JOIN [User] u ON ut.userId = u.id
        INNER JOIN Agreement a ON a.arrangerId = u.reportingManagerId
        INNER JOIN CertificateOfSepulcher cs ON cs.agreementId = a.id
        WHERE
        ut.teamId = :teamId
        AND ut.deletedAt IS NULL
        AND ut.deletedBy IS NULL
        AND cs.deletedAt IS NULL
        AND cs.deletedBy IS NULL
        AND a.propertyPaidInFullDate BETWEEN :startDate AND :endDate`

        const getSelpulchers = await models.sequelize.query(sepulcherQuery, {
            type: models.sequelize.QueryTypes.SELECT,
            replacements: {
                teamId: teamId,
                startDate: startDate,
                endDate: endDate
            }
        })

        const downloadZipFileName = `${moment().format('YYYYMMDD')}.zip`
        let bufferData = []
        if (getSelpulchers.length > 0) {
            const zip = new AdmZip()
            await Promise.all(
                getSelpulchers.map(async (certificate, index) => {
                    let certificateOfSepulcherPdfFileAzureUrl = await uploadFileController.downloadFileWithSignature(certificate.azureFileUrl)
                    const fileName = certificate.azureFileUrl.split('/')
                    const OrgFileName = fileName[1].split('-')
                    const localFilePath =
                      './' + OrgFileName[1] + '-' + OrgFileName[2]
                    await this.downloadCertificateOfSepulcherPdfFile(certificateOfSepulcherPdfFileAzureUrl, localFilePath)
                    const path = await realpath(localFilePath)
                    zip.addLocalFile(path)
                    await unlink(localFilePath)
                })
            )
            bufferData = zip.toBuffer()
        }

        return {
            downloadZipFileName,
            bufferData
        }
    }

    async downloadCertificateOfSepulcher (userId, timezone) {
        let transaction
        try {
            transaction = await models.sequelize.transaction()
            const getAgreementDetails = await models.Agreement.findOne({
                where: {
                    id: this.agreementId
                }
            })
            const uploadCheck = await this.checkForCertificateOfSepulcher(getAgreementDetails.totalPaid)
            if (uploadCheck) {
                const userController = new UserController('', userId)
                const userDetails = await userController.getUserDetails()

                let agreementPropertyOwners = await this.getOwnersOfProperties()
                const modifiedAgreementPropertyOwners = await this.filterAgreementPropertyOwnersForCertificateOfSepulcher(agreementPropertyOwners)
                const agreementCertOfSepulcherResult = await models.CertificateOfSepulcher.findAll({
                    where: {
                        agreementId: this.agreementId,
                        deletedAt: null
                    }
                })
                const contractNumber = _.get(getAgreementDetails, 'contractNumber').trim()
                const zip = new AdmZip()

                await Promise.all(
                    modifiedAgreementPropertyOwners.map(async (property) => {
                        let index = agreementCertOfSepulcherResult.findIndex(x => x.agreementPropertyId === property.id)
                        const certificateNumber = _.get(agreementCertOfSepulcherResult[index], 'certificateNumber')

                        let trackCertificateOfSepulcherFileDownloadObject = {
                            createdBy: userId,
                            updatedBy: userId,
                            certificateNumber: certificateNumber
                        }
                        if (certificateNumber) {
                            await models.TrackCertificateOfSepulcherFileDownload.create(trackCertificateOfSepulcherFileDownloadObject, { transaction }).then(async sepulcherResult => {
                                const certificateGeneratedOn = moment(agreementCertOfSepulcherResult[index].createdAt).tz(timezone).format('MM/DD/YYYY')
                                const { clWaterMarkBg, raySign, bobSign, footerLogo, stamp, clLogo } = await getAssetsPathForCertOfSepulcher()
                                let pdfName = certificateNumber + '.pdf'
                                let pdfPath = './' + pdfName
                                let pdfData = {
                                    certificateNumber: certificateNumber,
                                    propertyName: property.name,
                                    ownerName: _.map(property.ownerDetails, (owner) => {
                                        return getNameOfPerson(owner.firstName, owner.middleName, owner.lastName)
                                    }).join(', '),
                                    contractNumber: contractNumber,
                                    rightsWithProperty: property.rightsWithProperty,
                                    rightsPurchased: property.rightsPurchased,
                                    clWaterMarkBg: `data:image/png;base64, ${clWaterMarkBg}`,
                                    raySign: `data:image/png;base64, ${raySign}`,
                                    bobSign: `data:image/png;base64, ${bobSign}`,
                                    footerLogo: `data:image/png;base64, ${footerLogo}`,
                                    stamp: `data:image/png;base64, ${stamp}`,
                                    clLogo: `data:image/png;base64, ${clLogo}`,
                                    downloadedBy: _.get(userDetails, 'name', ''),
                                    downloadedTime: moment().tz(timezone).format('MM/DD/YYYY hh:mm A'),
                                    certificateGeneratedOn: certificateGeneratedOn
                                }
                                await generatePDF('certificateOfSepulcher', pdfData, { pageHeight: '8.5in', pageWidth: '11in' }, pdfPath)
                                let certificateOfSepulcherPdfFile = await realpath(pdfPath)

                                // zip multiple files code
                                zip.addLocalFile(certificateOfSepulcherPdfFile)
                                await unlink(certificateOfSepulcherPdfFile)
                                return property
                            })
                        }
                    })
                )
                await transaction.commit()
                const downloadZipFileName = `${contractNumber}.zip`
                const data = zip.toBuffer()
                return {
                    downloadZipFileName,
                    bufferData: data
                }
            } else {
                await transaction.commit()
                throw new Error('SEPULCHER_NOT_AVAILABLE')
            }
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    async getCertificateNumber (transaction) {
        const certOfSepulcherResult = await models.sequelize.query(`SELECT TOP 1 * FROM CertificateOfSepulcher ORDER BY id DESC`, {
            type: models.sequelize.QueryTypes.SELECT,
            transaction
        })
        const month = moment().format('MM')
        const year = moment().format('YYYY')
        let existingCertificateNumber = _.get(certOfSepulcherResult[0], 'certificateNumber')
        let yearValue = 0
        if (existingCertificateNumber) {
            let splittedNumber = existingCertificateNumber.split('-')
            yearValue = splittedNumber[0].substr(splittedNumber[0].length - 4)
        }
        let certficiateNumber
        if (!certOfSepulcherResult.length || year !== yearValue) {
            certficiateNumber = `${month}${year}-000001`
        } else {
            const regex = /(.*-[0]*)(\d*)/
            const match = regex.exec(certOfSepulcherResult[0].certificateNumber)
            certficiateNumber = match[1] + (Number(match[2]) + 1)
            let reformatNumber = certficiateNumber.split('-')
            certficiateNumber = `${month}${year}-${reformatNumber[1]}`
        }
        return certficiateNumber
    }

    async updatePropertyPaidInFullDate () {
        let transaction
        try {
            transaction = await models.sequelize.transaction()
            const getAgreementDetails = await models.Agreement.findOne({
                where: {
                    id: this.agreementId
                },
                transaction
            })
            const getAddendumDetails = await models.Addendum.findAll({
                where: {
                    agreementId: this.agreementId
                },
                transaction
            })
            if (getAddendumDetails.length) {
                let showCertificateOfSepulcher = await certificateOfSepulcherCondition(this.agreementId, null, transaction)
                if (showCertificateOfSepulcher && !getAgreementDetails.propertyPaidInFullDate) {
                    const propertyPaidInFullDate = showCertificateOfSepulcher ? new Date() : null
                    await models.Agreement.update({
                        propertyPaidInFullDate
                    }, {
                        where: { agreementId: this.agreementId },
                        transaction
                    })
                }
            }
            await transaction.commit()
        } catch (error) {
            logger.error(error)
            await transaction.rollback()
            throw error
        }
    }

    async generateCertificateOfSepulcherFilesAndUploadToAzure (userId, totalPaid, tx, noTransaction, noCommit) {
        let transaction
        try {
            transaction = tx || await models.sequelize.transaction()
            let useTx = !noTransaction ? transaction : null
            const getAgreementDetails = await models.Agreement.findOne({
                where: {
                    id: this.agreementId
                },
                transaction: useTx
            })

            const uploadCheck = await this.checkForCertificateOfSepulcher(totalPaid, useTx)
            if (uploadCheck) {
                let agreementPropertyOwners = await this.getOwnersOfProperties(useTx)

                const modifiedAgreementPropertyOwners = await this.filterAgreementPropertyOwnersForCertificateOfSepulcher(agreementPropertyOwners)

                const agreementCertOfSepulcherResult = await models.CertificateOfSepulcher.findAll({
                    where: {
                        agreementId: this.agreementId,
                        deletedAt: null
                    },
                    transaction
                })

                for (let property of modifiedAgreementPropertyOwners) {
                    if (!agreementCertOfSepulcherResult.length) {
                        let certificateOfSepulcherObject = {
                            agreementPropertyId: property.id,
                            agreementId: this.agreementId,
                            azureFileUrl: '',
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            createdBy: userId,
                            updatedBy: userId,
                            certificateNumber: await this.getCertificateNumber(transaction)
                        }
                        await models.CertificateOfSepulcher.create(certificateOfSepulcherObject, { transaction }).then(async sepulcherResult => {
                            // const certificateNumber = sepulcherResult.id
                            const certificateNumber = sepulcherResult.certificateNumber
                            const today = certificateOfSepulcherObject.createdAt.toISOString().substring(0, 10)
                            const dateSplit = today.split('-')
                            // const certificateGeneratedOn = moment(certificateOfSepulcherObject.createdAt).format('MM/DD/YYYY')
                            const certificateGeneratedOn = `${dateSplit[1]}/${dateSplit[2]}/${dateSplit[0]}`

                            const { clWaterMarkBg, raySign, bobSign, footerLogo, stamp, clLogo } = await getAssetsPathForCertOfSepulcher()
                            const contractNumber = _.get(getAgreementDetails, 'contractNumber')
                            let pdfName = certificateNumber + '.pdf'
                            let pdfPath = './' + pdfName
                            let pdfData = {
                                certificateNumber: certificateNumber,
                                propertyName: property.name,
                                ownerName: _.map(property.ownerDetails, (owner) => {
                                    return getNameOfPerson(owner.firstName, owner.middleName, owner.lastName)
                                }).join(', '),
                                contractNumber: contractNumber.trim(),
                                rightsWithProperty: property.rightsWithProperty,
                                rightsPurchased: property.rightsPurchased,
                                clWaterMarkBg: `data:image/png;base64, ${clWaterMarkBg}`,
                                raySign: `data:image/png;base64, ${raySign}`,
                                bobSign: `data:image/png;base64, ${bobSign}`,
                                footerLogo: `data:image/png;base64, ${footerLogo}`,
                                stamp: `data:image/png;base64, ${stamp}`,
                                clLogo: `data:image/png;base64, ${clLogo}`,
                                certificateGeneratedOn: certificateGeneratedOn
                            }
                            await generatePDF('certificateOfSepulcher', pdfData, { pageHeight: '8.5in', pageWidth: '11in' }, pdfPath)
                            let certificateOfSepulcherPdfFile = await realpath(pdfPath)
                            const uploadFileController = new UploadFileController()
                            const azureFolderToStoreCertificateOfSepulcherPdfFile = 'CertificateOfSepulcher'
                            let fileBinary = {
                                path: certificateOfSepulcherPdfFile,
                                mimetype: 'application/pdf',
                                originalname: pdfName
                            }
                            let certificateOfSepulcherPdfFileAzureUrl = await uploadFileController.uploadFileWithSignature(fileBinary, azureFolderToStoreCertificateOfSepulcherPdfFile)

                            await models.CertificateOfSepulcher.update({
                                azureFileUrl: certificateOfSepulcherPdfFileAzureUrl.originalFileName
                            }, {
                                where: { certificateNumber: sepulcherResult.certificateNumber }, transaction
                            })
                        })
                    }
                }
                if (!tx) {
                    await transaction.commit()
                }
            } else {
                if (!noCommit) {
                    await transaction.commit()
                }
            }
        } catch (error) {
            logger.error(error)
            await transaction.rollback()
            throw error
        }
    }

    /**
     * this method returns boolean based (total paid for contract > confirmed (property price + efc amount)) and contract (including all addendums) must be submitted
     */
    async checkForCertificateOfSepulcher (totalPaid, transaction) {
        try {
            let contractSubmittedStatusCount = await models.sequelize.query(`SELECT count(*) AS contractSubmitStatusCount FROM Agreement a
            LEFT JOIN Addendum ad ON a.id = ad.agreementId
            WHERE a.id = :agreementId and (a.status = 'In progress' OR ad.status = 'In progress')`, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId
                },
                transaction
            })
            let showCertificateOfSepulcher = false
            if (!_.get(contractSubmittedStatusCount[0], 'contractSubmitStatusCount')) {
                showCertificateOfSepulcher = await certificateOfSepulcherCondition(this.agreementId, totalPaid, transaction)
            }
            return showCertificateOfSepulcher
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * this method returns owners of a properties
     */
    async getOwnersOfProperties (transaction) {
        try {
            let query = `select DISTINCT ap.id,a.contractNumber,props.propertyItemCode,props.name,props.id as propertyId,pt.name as propertyType,props.total as price,ad.addendumNumber,ad.id as addendumId,
            itr.rights AS rights,
            ISNULL(apar.rightsPurchased, 0) AS rightsPurchased,
            itr.rights AS rightsWithProperty,
            itr.maxRights AS maxRights
            from Property props inner JOIN
            AgreementProperty ap on ap.propertyId= props.id INNER JOIN
            Agreement a on a.id= ap.agreementId
            LEFT JOIN  Addendum ad on ad.id=ap.addendumId
            INNER JOIN [PropertyGarden] AS pg ON pg.id = props.propertyGardenId
            INNER JOIN [PropertyCampus] AS pc ON pc.id = pg.propertyCampusId
            INNER JOIN [PropertyTypeCode] AS ptc ON ptc.id = props.propertyTypeCodeId
            INNER JOIN [PropertyType] AS pt ON pt.id = ptc.propertyTypeId
            LEFT JOIN (select count(*) as rightsPurchased, apar.agreementPropertyId from AgreementPropertyAdditionalRight apar
                WHERE apar.deletedBy is NULL AND apar.deletedAt is NULL
                GROUP by apar.agreementPropertyId
                ) apar on apar.agreementPropertyId=ap.id
            LEFT OUTER JOIN [IntermentRights] AS itr ON itr.propertyCampusId=pc.id AND itr.propertyTypeId=pt.id
            where itr.graves = (CASE WHEN pt.name = 'Grave' THEN 1 ELSE itr.graves END ) AND ap.agreementId = ${this.agreementId} and ap.reservationStatus='confirmed' and ap.reservationType in ('At-Need', 'Guaranteed') and ap.deletedAt is null and ap.deletedBy is null`

            let properties = await models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT, transaction })

            const propertyIds = properties.map(item => item.id)
            properties = properties.map(item => {
                item.ownerDetails = []
                return item
            })
            if (propertyIds.length) {
                let ownerDetails = await models.sequelize.query(`
                SELECT apo.agreementPropertyId,apo.ownerId,apo.deletedInAddendumId,apo.createdAt,
                pvd.onePortalId,p.firstName,p.middleName,p.lastName, ISNULL(APAR.totalRights,0) as additionalRights
                from AgreementPropertyOwner  apo LEFT JOIN
                Person p on p.id=apo.ownerId LEFT JOIN
                PersonVerificationDetails pvd on pvd.personId=p.id
                LEFT JOIN (select count(*) as totalRights, agreementPropertyId from AgreementPropertyAdditionalRight where agreementPropertyId in (${propertyIds})
                AND deletedBy is NULL AND deletedAt is NULL
                GROUP by agreementPropertyId
                ) APAR on APAR.agreementPropertyId=apo.agreementPropertyId
                where apo.agreementPropertyId in (${propertyIds})  and apo.deletedAt is null and apo.deletedBy is null`, { type: models.sequelize.QueryTypes.SELECT, transaction })

                ownerDetails.forEach(detail => {
                    properties.forEach(prop => {
                        if (prop.id === detail.agreementPropertyId) {
                            prop.rights += detail.additionalRights
                            delete detail.additionalRights
                            prop.ownerDetails.push(detail)
                        }
                    })
                })
            }
            return properties
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
    * this method adds a agreement property owner
    * @param {number} agreementPropertyId
    * @param {object} data
    * @param {number} data.ownerId
    * @param {object} user
    * @param {number} user.id
    */
    async addAgreementPropertyOwner (agreementPropertyId, data, user) {
        const { queueNames, queues } = require('../../../appQueues')
        let transaction
        try {
            transaction = await models.sequelize.transaction()
            const { ownerId } = data
            const property = await models.AgreementProperty.findOne({
                where: {
                    id: agreementPropertyId
                },
                transaction
            })
            if (!property) {
                throw new Error('AGREEMENT_PROPERTY_ITEM_NOT_FOUND')
            }
            const person = await models.Person.findOne({ where: {
                id: ownerId
            },
            transaction })
            if (!person) {
                throw new Error('PERSON_NOT_FOUND')
            }
            if (data.addedInAddendumId) {
                const addendum = await models.Addendum.findOne({
                    where: {
                        id: data.addedInAddendumId,
                        agreementId: this.agreementId
                    }
                })
                if (!addendum) {
                    throw new Error('ADDENDUM_NOT_FOUND')
                }
            }
            const propertyOwner = await models.AgreementPropertyOwner.findOne({ where: {
                agreementPropertyId,
                ownerId,
                deletedAt: null,
                deletedBy: null
            },
            transaction })

            if (propertyOwner) {
                throw new Error('Cannot add duplicate owner to same property')
            }
            const payload = {
                ownerId,
                agreementPropertyId,
                addedInAddendumId: _.get(data, 'addedInAddendumId', null)
            }
            await upsert('AgreementPropertyOwner', payload, transaction, { userId: user.id })
            const agreementPropertyOwners = await this.getOwnersOfProperties(transaction)
            const webCemQueue = queues[queueNames.webCemQueue]
            const webCemData = {
                event: 'property.owners.add',
                payload: {
                    personId: ownerId,
                    propertyId: property.propertyId,
                    agreementPropertyId: agreementPropertyId,
                    addedInAddendumId: _.get(data, 'addedInAddendumId', null),
                    agreementPropertyOwners: agreementPropertyOwners,
                    userId: user.id
                }
            }
            webCemQueue.add('webCemQueue', webCemData)
            await transaction.commit()
            return agreementPropertyOwners
        } catch (error) {
            logger.error(error)
            await transaction.rollback()
            throw error
        }
    }

    /**
     * this method soft deletes an owner
     * @param {object} data
     * @param {number} data.propertyId
     * @param {number} data.ownerId
     * @param {number} data.deletedInAddendumId
     * @param {object} user
     * @param {number} user.id
     */
    async deleteAgreementPropertyOwner (data, user) {
        let transaction
        const { queueNames, queues } = require('../../../appQueues')
        try {
            transaction = await models.sequelize.transaction()
            const { propertyId, ownerId } = data
            const property = await models.AgreementPropertyOwner.findOne({
                where: {
                    agreementPropertyId: propertyId
                },
                transaction
            })
            if (!property) {
                throw new Error('AGREEMENT_PROPERTY_ITEM_NOT_FOUND')
            }
            if (data.deletedInAddendumId) {
                const addendum = await models.Addendum.findOne({
                    where: {
                        id: data.deletedInAddendumId,
                        agreementId: this.agreementId
                    }
                })
                if (!addendum) {
                    throw new Error('ADDENDUM_NOT_FOUND')
                }
            }
            const agreementPropertyOwner = await models.AgreementPropertyOwner.findOne({
                where: {
                    agreementPropertyId: propertyId,
                    ownerId,
                    deletedAt: null,
                    deletedBy: null
                },
                transaction
            })
            if (!agreementPropertyOwner) {
                throw new Error('Person is not an owner of this property')
            }
            const deletePayload = {
                id: _.get(agreementPropertyOwner, 'id'),
                deletedInAddendumId: _.get(data, 'deletedInAddendumId', null),
                deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                deletedBy: user.id
            }
            const webCemQueue = queues[queueNames.webCemQueue]
            const webCemData = {
                event: 'property.owners.remove',
                payload: {
                    personId: ownerId,
                    agreementPropertyId: property.agreementPropertyId,
                    addedInAddendumId: _.get(data, 'addedInAddendumId', null),
                    userId: user.id
                    // agreementPropertyOwners: agreementPropertyOwners
                }
            }
            webCemQueue.add('webCemQueue', webCemData)
            await upsert('AgreementPropertyOwner', deletePayload, transaction, { userId: user.id })
            const agreementPropertyOwners = await this.getOwnersOfProperties(transaction)
            await transaction.commit()
            return agreementPropertyOwners
        } catch (error) {
            logger.error(error)
            await transaction.rollback()
            throw error
        }
    }
}

module.exports = PropertyController
