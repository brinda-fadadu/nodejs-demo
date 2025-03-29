const models = require('../../../models/index')
const AgreementItemPriceController = require('./agreementItemPriceController')
const SchedulingController = require('../schedulingController/schedulingController')
const { upsert } = require('../utils')
const _ = require('lodash')
const moment = require('moment')
const logger = require('../../../lib/logger')
const AddendumController = require('./addendum')
const ChangeLogController = require('./changeLog')

// extending agreementItemPrice controller to add agreementItemPrice record w.r.to agreementcashadvanceditem
class AgreementPackageController extends AgreementItemPriceController {
    constructor (agreementId) {
        super()
        this.agreementId = agreementId
    }
    /**
     *
     * @param {Object} data request data for adding(creating/updating) cashadvanceitem to agreement
     * @param {*} transaction
     * @param {number} data.id id of the cashAdvanceItem to be updated
     * @param {number} data.agreementId id of the agreement to which the CAI is being added/updated
     * @param {number} data.locationItemId id of the item
     * @param {string} data.note a note given for the CAI
     * @param {number} data.userId id of the currently logged in user
     */
    async _createOrUpdateCAI (data, transaction) {
        try {
            let getCAI
            if (data.id) {
                getCAI = await models.AgreementCashAdvancedItem.findOne({ where: { id: data.id }, transaction })
                data.agreementItemPriceId = getCAI.agreementItemPriceId
            }
            // creating/updating agreementitemprice for agreementcashadvanceditem
            const agreementItemPriceResult = await this.upsertAgreementItemPrice(data, transaction)
            let reqBody = {
                id: data.id,
                agreementId: data.agreementId,
                locationItemId: data.locationItemId,
                note: data.note,
                agreementItemPriceId: agreementItemPriceResult.id
            }
            const createdResult = await upsert('AgreementCashAdvancedItem', reqBody, transaction, { userId: data.userId })
            return createdResult.toJSON()
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    /**
     *
     * @param {*} data to create/update AgreementCashAdvancedItem
     * @param {number} data.id id of the cashAdvanceItem to be updated
     * @param {number} data.agreementId id of the agreement to which the CAI is being added/updated
     * @param {number} data.locationItemId id of the item
     * @param {string} data.note a note given for the CAI
     * @param {number} data.userId id of the currently logged in user
     */
    async upsertPackage (data) {
        try {
            const finalResult = await models.sequelize.transaction(async (transaction) => {
                let result = await this._createOrUpdateCAI(data, transaction)
                // updating agreement totals.
                const agreementSummary = await models.Agreement.updateAndGetTotal(data.agreementId, data.userId, transaction)
                return {
                    ...result,
                    ...agreementSummary
                }
            })
            return finalResult
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    /**
     *
     * @param {Object} payload
     * @param {number} payload.packageId is the id of the package
     * @param {number} payload.userId is the id of the currently loggedin user
     * @param {string} action add/remove the package to a agreement
     */
    async createOrUpdatePackage (payload, action) {
        try {
            const result = await models.sequelize.transaction(async (transaction) => {
                let existingAgreementItemQuantity
                let inProgressAddendum
                const AgreementController = require('./agreementController')
                const agreementController = new AgreementController(this.agreementId)
                const addendumController = new AddendumController(this.agreementId)
                const agreement = await agreementController.getAgreementDetails(transaction)
                inProgressAddendum = await addendumController.getInProgressAddendum(transaction)

                if (!payload.addendumId) {
                    payload.addendumId = null
                    if (agreement.status === 'Submitted' && (!inProgressAddendum || !payload.addendumId)) {
                        throw new Error('AGREEMENT_ALREADY_COMPLETED')
                    }
                } else {
                    if (action === 'add' && (payload.addendumId !== inProgressAddendum.id)) {
                        throw new Error('ADDENDUM_ALREADY_COMPLETED')
                    }
                }
                const existingAgreementPackage = await models.AgreementPackage.findOne({
                    where: {
                        packageId: payload.packageId,
                        agreementId: this.agreementId,
                        deletedAt: null
                    },
                    transaction
                })
                if (existingAgreementPackage) {
                    existingAgreementItemQuantity = 1
                } else {
                    existingAgreementItemQuantity = 0
                }

                if ((existingAgreementItemQuantity === 1 && action === 'add') ||
                    (existingAgreementItemQuantity === 0 && action === 'remove')) {
                    throw new Error(`${_.upperCase('PACKAGE').split(' ').join('_')}_ALREADY_${action === 'add' ? 'ADDED' : 'REMOVED'}`)
                }
                const packageDetails = await models.Package.findOne({ where: { id: payload.packageId }, transaction })
                if (!packageDetails) {
                    throw new Error('PACKAGE_NOT_FOUND')
                }

                let agreementPackagePayload = {}
                let agreementItemPricePayload = {}
                if (action === 'remove') {
                    agreementPackagePayload.id = existingAgreementPackage.id
                    agreementPackagePayload.deletedBy = payload.userId
                    agreementPackagePayload.deletedAt = moment().format('YYYY/MM/DD HH:mm:ss')

                    // This is only for deleting Scheduled Services
                    let pkgItems = await models.AgreementPackageItem.findAll({
                        where: {
                            agreementPackageId: existingAgreementPackage.id
                        }
                    })

                    await Promise.all(pkgItems.map(async item => {
                        let schedulingPayload = {
                            agreementPackageItemId: item.id,
                            removeAll: true,
                            itemCategoryName: 'Package',
                            apiType: (payload.apiType) ? payload.apiType : null
                        }
                        await SchedulingController.deleteScheduledFuneralServices(this.agreementId, schedulingPayload, payload.userId, payload.timezone, transaction)
                    }))
                } else {
                    agreementItemPricePayload = {
                        price: packageDetails.price,
                        quantity: this._updateQuantity(action, payload.removeAll, existingAgreementItemQuantity),
                        agreementItemPriceId: _.get(existingAgreementPackage, 'agreementItemPriceId', null),
                        packageId: payload.packageId // To calculate tax value
                    }
                    const agreementItemPrice = await this.upsertAgreementItemPrice(agreementItemPricePayload, transaction)
                    agreementPackagePayload = {
                        id: _.get(existingAgreementPackage, 'id'),
                        agreementId: this.agreementId,
                        agreementItemPriceId: _.get(agreementItemPrice, 'id'),
                        packageId: payload.packageId,
                        addendumId: payload.addendumId
                    }
                }
                let context = {
                    userId: payload.userId
                }
                const upsertedAgreementPackage = await upsert('AgreementPackage', agreementPackagePayload, transaction, context)
                if (action === 'add') {
                    await this._addPackageItemsToAgreement(upsertedAgreementPackage.id, payload.packageId, transaction)
                }
                // Recalculating the agreement adjustment promocode discounts
                let AdjustmentsController = require('../adjustmentController/discountsAndAdjustmentsHandler')
                const adjController = new AdjustmentsController()
                await adjController.reCalculatePromoCodeDiscounts(this.agreementId, payload.userId, transaction)

                const agreementSummary = await models.Agreement.updateAndGetTotal(this.agreementId, payload.userId, transaction, payload.addendumId)
                await ChangeLogController.recordAction(action, upsertedAgreementPackage.id, 'AgreementPackage', transaction)

                return {
                    ...agreementItemPricePayload,
                    ...upsertedAgreementPackage.toJSON(),
                    ...agreementSummary
                }
            })
            return result
        } catch (error) {
            throw error
        }
    }

    /**
     * @param {string} action it defines the action to be performed on the item
     * @param {boolean} removeAll boolean to define if all the items of the agreement to be removed or not
     * @param {number} prevQuantity previous quantity of the item
     */
    _updateQuantity (action, removeAll, prevQuantity) {
        switch (action) {
        case 'add':
            return prevQuantity + 1
        case 'remove':
            return removeAll ? 0 : prevQuantity - 1
        default:
            return prevQuantity
        }
    }
    async getAgreementPackages () {
        try {
            const query = `SELECT ap.packageId,
            ap.id,
            ap.addendumId,
            ad.addendumNumber,
            a.contractNumber AS agreementNumber,
            ap.agreementId,
            aip.totalPrice,
            aip.totalTax,
            aip.unitPrice,
            aip.unitTax,
            aip.quantity,
            ap.agreementItemPriceid,
            p.name,
            p.description,
            'packages' AS itemType,
            p.code FROM AgreementPackage ap
                INNER JOIN AgreementItemPrice aip ON ap.agreementItemPriceId=aip.id
                INNER JOIN Agreement a ON a.id = ap.agreementId
                LEFT OUTER JOIN Addendum ad ON ad.id = ap.addendumId
                 INNER JOIN Package p ON p.id=ap.packageId WHERE ap.agreementId=:agreementId AND deletedAt IS NULL;`

            const result = await models.sequelize.query(query, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId
                }
            })
            return result
        } catch (err) {
            throw err
        }
    }
    /**
     * Internal Method to add agreement package items
     * @param {number} agreementPackageId is the id of the package of the agreement
     * @param {number} packageId is the id of the package
     * @param {*} transaction
     */
    async _addPackageItemsToAgreement (agreementPackageId, packageId, transaction) {
        try {
            const packageLocationItem = await models.PackageLocationItem.findAll({
                where: {
                    packageId: packageId,
                    isActive: 1
                },
                transaction: transaction
            })
            const agreementPackageItems = packageLocationItem.map(ele => {
                return {
                    agreementPackageId,
                    packageId,
                    locationItemId: ele.locationItemId
                }
            })
            await models.AgreementPackageItem.bulkCreate(agreementPackageItems, { transaction: transaction })
            return true
        } catch (err) {
            throw err
        }
    }

    /**
     *
     * @param {number} agreementPackageId is the id of the package of the agreement
     */
    static async getAgreementPackageItems (agreementPackageId) {
        try {
            const agreementPackage = await models.AgreementPackage.findOne({
                where: {
                    id: agreementPackageId,
                    deletedAt: null
                }
            })
            if (!agreementPackage) {
                throw new Error('PACKAGE_STATEMENT_NOT_FOUND')
            }
            const query = ` SELECT li.id,i.name,i.code,i.description FROM  AgreementPackageItem api INNER JOIN
            LocationItem li ON api.locationItemId = li.id
            INNER JOIN Item i ON i.id=li.itemId
            WHERE api.agreementPackageId=:agreementPackageId  `

            const result = await models.sequelize.query(query, {
                replacements: {
                    agreementPackageId: agreementPackage.id
                }
            })
            return result
        } catch (err) {
            throw err
        }
    }
}
module.exports = exports = AgreementPackageController
