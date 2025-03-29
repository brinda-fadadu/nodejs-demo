const moment = require('moment')
const models = require('../../../models')
const AgreementItemPriceController = require('./agreementItemPriceController')
const ItemUsageController = require('../itemUsageController/itemUsageController')
const { HMISClient } = require('../../../services/hmis')
const { getConfigValue } = require('../../../utils/dbGetFunctions')
const ChangeLogController = require('./changeLog')

const STATUSES = {
    RESERVED: 'reserved',
    CONFIRMED: 'confirmed'
}

class AgreementPropertyAdditionalRight {
    constructor (agreementId, agreementPropertyId) {
        this.agreementId = agreementId
        this.agreementPropertyId = agreementPropertyId
    }

    /**
     * Fetch interment rights using the property object
     * @param {Object} property is the object of the property db instance
     * @param {object} transaction is the DB transaction
     */
    async _fetchIntermentRightFromProperty (property, transaction) {
        const propertyGarden = await models.PropertyGarden.findOne({
            where: {
                id: property.propertyGardenId
            },
            transaction
        })
        const intermentRights = await models.sequelize.query(`select top 1 * from IntermentRights itr
        inner join PropertyType pt on pt.id=itr.propertyTypeId
        where itr.propertyTypeId=${property.propertyTypeCode.propertyTypeId}
        and itr.propertyCampusId=${propertyGarden.propertyCampusId}
        and itr.graves=(CASE WHEN pt.name = 'Grave' THEN 1 ELSE itr.graves END )`, { type: models.sequelize.QueryTypes.SELECT, transaction })
        return intermentRights[0]
    }

    /**
     * Fetch Agreement Property
     * @param {object} transaction is the DB transaction
     */
    async fetchCompletedAgreementProperty (transaction) {
        const agreementProperty = await models.AgreementProperty.findOne({
            where: {
                id: this.agreementPropertyId,
                reservationStatus: STATUSES.CONFIRMED
            },
            include: [
                {
                    model: models.AgreementItemPrice,
                    as: 'agreementPropertyPriceDetails'
                }
            ],
            transaction
        })
        if (!agreementProperty) {
            throw new Error('AGREEMENT_PROPERTY_NOT_CONFIRMED')
        }
        return agreementProperty
    }
    /**
     * Generate lotspace id based on the agreement property Id
     * @param {Number} agreementPropertyId
     */
    async __generateLotSpaceId (agreementPropertyId, transaction) {
        try {
            const agreementProperty = await models.AgreementProperty.findByPk(agreementPropertyId, {
                include: [{
                    model: models.Property,
                    as: 'property'
                }]
            })
            const result = await HMISClient.createNewLotSpace(agreementProperty.property.lotSellUnitId, transaction)
            const lotspace = await models.LotSpace.create({
                lotSpaceId: result.lotSpaceId,
                lotSellUnitId: agreementProperty.property.lotSelUnitId,
                sequence: result.sequence,
                location: result.location,
                sectionCode: result.sectionCode,
                cemeteryCode: result.cemeteryCode
            })
            return lotspace
        } catch (err) {
            throw err
        }
    }

    /**
     * Create new additional rights
     * @param {Object} data is the object from reqBody
     * @param {Object} user is the object containing the current user details
     * @param {object} transaction is the DB transaction
     */
    async _createAdditionalRights (data, user = {}, transaction) {
        try {
            const result = await this.__generateLotSpaceId(this.agreementPropertyId, transaction)
            const additionalRightData = {
                agreementId: this.agreementId,
                addendumId: data.addendumId,
                lotSellUnitId: result.lotSellUnitId,
                lotSpaceId: result.id,
                agreementItemPriceId: data.agreementItemPriceId,
                agreementPropertyId: this.agreementPropertyId,
                createdAt: moment().format(),
                createdBy: user.id
            }
            return models.AgreementPropertyAdditionalRight.create(additionalRightData, { transaction })
        } catch (err) {
            throw err
        }
    }

    /**
     * soft delete additional rights
     * @param {Object} data is the object from reqBody
     * @param {Object} user is the object containing the current user details
     * @param {object} transaction is the DB transaction
     */
    async _deleteAdditionalRights (data, user = {}, transaction) {
        const userId = user.id
        const additionalRight = await this._getAdditionalRight(data.additionalRightId, transaction)
        const lotSpaceId = additionalRight.lotspace.lotSpaceId
        // Check Property Consumption and Remove Additional Right
        let itemUsageStatus = await ItemUsageController.getStatusOfItemUsage({
            resourceType: 'AgreementProperty',
            resourceId: this.agreementPropertyId,
            lotSpaceId: lotSpaceId,
            deletedAt: null,
            deletedBy: null
        }, transaction)
        if (itemUsageStatus !== 'Used') {
            // Unselect Item Usage Properties
            await ItemUsageController.unselectPropertiesItemUsage(userId, [this.agreementPropertyId], lotSpaceId, transaction)
            additionalRight.deletedBy = userId
            additionalRight.deletedAt = moment().format()
            return additionalRight.save({ transaction })
        } else {
            throw new Error('Property Additional Right(s) with ‘Used’ status cannot be Deleted')
        }
    }

    /**
     * fetch the additional right using id
     * @param {number} additionalRightId is the additionalRight id
     * @param {object} transaction is the DB transaction
     */
    _getAdditionalRight (additionalRightId, transaction) {
        return models.AgreementPropertyAdditionalRight.scope('lotSpaceScope').findOne({
            where: {
                id: additionalRightId
            },
            transaction
        })
    }

    /**
     * update(add/remove) additional rights
     * @param {Object} data is the object from reqBody
     * @param {string} action is the action to perform (add/remove)
     * @param {Object} user is the object containing the current user details
     */
    async updateAdditionalRights (data, action, user) {
        let transaction
        try {
            const AgreementPropertyController = require('./agreementPropertiesController')
            transaction = await models.sequelize.transaction()
            const agreementProperty = await this.fetchCompletedAgreementProperty(transaction)
            const agreementPropertyController = new AgreementPropertyController(this.agreementId)
            const property = await agreementPropertyController.getProperty(agreementProperty.propertyId, transaction)
            const intermentRights = await this._fetchIntermentRightFromProperty(property, transaction)
            const existingAdditionalRights = await this.listAdditionalRights(transaction)
            let additionalRights
            switch (action) {
            case 'add':
                // throw error if rights is equal to maxRights
                if (intermentRights.rights + existingAdditionalRights.length >= intermentRights.maxRights) {
                    throw new Error('ADDITIONAL_RIGHTS_OVERFLOW')
                }
                // Creation of agreementItemPrice
                const getAdditionalRightsPrice = JSON.parse(await getConfigValue('AdditionalRightsPrice'))
                const propertyPrice = property.price
                const additionalRightsMaxPrice = getAdditionalRightsPrice.maxPrice
                const additionalRightsMaxPercentageValue = getAdditionalRightsPrice.maxPercent / 100
                let agreementItemPriceData = {
                    quantity: 1,
                    price: (propertyPrice * additionalRightsMaxPercentageValue) > additionalRightsMaxPrice ? additionalRightsMaxPrice : Number(propertyPrice * additionalRightsMaxPercentageValue).toFixed(2)
                }
                if (propertyPrice === 0) {
                    agreementItemPriceData.price = additionalRightsMaxPrice
                }
                let agreementItemPriceController = new AgreementItemPriceController()
                let agreementItemPrice = await agreementItemPriceController.upsertAgreementItemPrice(agreementItemPriceData, transaction)
                // Creation of agreementPropertyAdditionalRight and lotSpace
                let additionalRightsData = {
                    addendumId: data.addendumId,
                    agreementItemPriceId: agreementItemPrice.id
                }
                additionalRights = await this._createAdditionalRights(additionalRightsData, user, transaction)
                // To Do : Update Change Log For Add
                /**
                 * Resource Type: AgreementPropertyAdditionalRight
                 * Resource Id: additional right id
                 */
                await ChangeLogController.recordAction('add', additionalRights.id, 'AgreementPropertyAdditionalRight', transaction)
                break
            case 'remove':
                if (intermentRights.rights + existingAdditionalRights.length === 1) {
                    throw new Error('ADDITIONAL_RIGHTS_UNDERFLOW')
                }
                additionalRights = await this._deleteAdditionalRights(data, user, transaction)
                // To Do : Update Change Log For Remove
                await ChangeLogController.recordAction('remove', additionalRights.id, 'AgreementPropertyAdditionalRight', transaction)
                break
            default:
                break
            }
            // Recalculating the agreement adjustment promocode discounts
            let AdjustmentsController = require('../adjustmentController/discountsAndAdjustmentsHandler')
            let adjCtrl = new AdjustmentsController()
            await adjCtrl.reCalculatePromoCodeDiscounts(this.agreementId, user.id, transaction)
            await models.Agreement.updateAndGetTotal(this.agreementId, user.id, transaction)
            await transaction.commit()
            return additionalRights
        } catch (error) {
            await transaction.rollback()
            throw error
        }
    }

    /**
     * returns all additional rights of a agreementProperty
     * @param {object} transaction is the DB transaction
     */
    async listAdditionalRights (transaction) {
        const query = `SELECT 
            apar.id, 
            apar.agreementPropertyId, 
            lt.lotSpaceId,
            ap.propertyId, 
            aip.totalPrice, 
            aip.totalTax,
            CASE
            WHEN apar.addendumId IS NOT NULL --Condition for taking agreementContractNumber or addendumNumber
            THEN ad.addendumNumber
            ELSE ag.contractNumber
            END AS contractNumber 
            FROM AgreementPropertyAdditionalRight apar
            INNER JOIN Agreement ag ON apar.agreementId = ag.id  --For agreement contract number
            LEFT OUTER JOIN Addendum ad ON ad.id = apar.addendumId  --For addendum contract number
            INNER JOIN AgreementProperty ap ON apar.agreementPropertyId = ap.id  --For property Id
            INNER JOIN LotSpace lt ON apar.lotSpaceId = lt.id  --For property Id
            INNER JOIN AgreementItemPrice aip ON apar.agreementItemPriceId = aip.id  --For price and tax
            WHERE apar.deletedBy is NULL AND apar.deletedAt is NULL AND apar.agreementPropertyId = ${this.agreementPropertyId}`
        return models.sequelize.query(query, {
            type: models.sequelize.QueryTypes.SELECT,
            transaction
        })
    }

    /**
     * remove all additional rights of a agreementProperty
     */
    async removeAdditionRights (propertyId, user, transaction) {
        const query = `SELECT id FROM AgreementPropertyAdditionalRight where agreementPropertyId=${propertyId} AND deletedAt IS NULL`
        let existingAdditionalRights = await models.sequelize.query(query, {
            type: models.sequelize.QueryTypes.SELECT,
            transaction
        })
        existingAdditionalRights = existingAdditionalRights.map(x => x.id)
        if (existingAdditionalRights && existingAdditionalRights.length) {
            for await (let rightId of existingAdditionalRights) {
                const additionalRights = await this._deleteAdditionalRights({
                    additionalRightId: rightId
                }, user, transaction)
                await ChangeLogController.recordAction('remove', additionalRights.id, 'AgreementPropertyAdditionalRight', transaction)
            }
        }
    }
}

module.exports = AgreementPropertyAdditionalRight
