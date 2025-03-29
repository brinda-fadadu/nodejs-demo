const moment = require('moment')

const { upsert } = require('../utils')
const logger = require('../../../lib/logger')
const models = require('../../../models')
const AgreementItemPriceController = require('./agreementItemPriceController')
const AddendumController = require('./addendum')
const SchedulingController = require('../schedulingController/schedulingController')
const ChangeLogController = require('./changeLog')
const _ = require('lodash')
// extending agreementItemPrice controller to add agreementItemPrice record w.r.to agreementcashadvanceditem
class AgreementCashAdvanceItemController extends AgreementItemPriceController {
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
            let getCAI, inProgressAddendum
            if (data.id) {
                // getCAI = await models.AgreementCashAdvancedItem.findOne({ where: { id: data.id }, transaction })
                getCAI = await this.getCashAdvanceItem(data.id, transaction)
                data.agreementItemPriceId = getCAI.agreementItemPriceId
            }
            const AgreementController = require('./agreementController')
            const agreementController = new AgreementController(data.agreementId)
            const agreement = await agreementController.getAgreementDetails(transaction)
            const addendumController = new AddendumController(data.agreementId)
            inProgressAddendum = await addendumController.getInProgressAddendum(transaction)

            if (!data.addendumId) {
                data.addendumId = null
                if (agreement.status === 'Submitted' && (!inProgressAddendum || !data.addendumId)) {
                    throw new Error('AGREEMENT_ALREADY_COMPLETED')
                }
            } else if (data.addendumId !== inProgressAddendum.id) {
                throw new Error('ADDENDUM_ALREADY_COMPLETED')
            }
            // creating/updating agreementitemprice for agreementcashadvanceditem
            const agreementItemPriceResult = await this.upsertAgreementItemPrice(data, transaction)
            let reqBody = {
                id: data.id,
                agreementId: data.agreementId,
                locationItemId: data.locationItemId,
                note: data.note,
                agreementItemPriceId: agreementItemPriceResult.id,
                addendumId: data.addendumId
            }
            const createdResult = await upsert('AgreementCashAdvancedItem', reqBody, transaction, { userId: data.userId })
            // TODO: Add Change log method here
            // This is only for deleting Scheduled Services
            if (getCAI && getCAI.agreementItemPrice && getCAI.agreementItemPrice.quantity > agreementItemPriceResult.quantity) {
                await SchedulingController.deleteScheduledFuneralServices(getCAI.agreementId, { agreementCashAdvancedItemId: data.id }, data.userId, data.timezone, transaction)
            }
            if (getCAI && _.get(getCAI, 'formId')) {
                const groupedItemsInForm = await models.AgreementCashAdvancedItem.findAll({
                    where: {
                        formId: getCAI.formId
                    },
                    transaction
                })
                const itemIds = groupedItemsInForm.map(item => item.id)
                await models.AgreementCashAdvancedItem.update({
                    formId: null
                }, {
                    where: {
                        id: itemIds
                    },
                    transaction
                })
                const caseInfoFormResult = await models.CaseInfoForm.findOne({ where: { id: getCAI.formId }, transaction })
                // void the cheque request form
                const FormsController = require('../formsController/formsController')
                if (!(caseInfoFormResult.status === 'Completed' || caseInfoFormResult.status === 'Declined')) {
                    await FormsController.voidCaseInfoForm(
                        getCAI.formId,
                        null,
                        transaction,
                        { isPersonIdNeeded: false }
                    )
                }
            }
            // Recalculating the agreement adjustment promocode discounts
            let AdjustmentsController = require('../adjustmentController/discountsAndAdjustmentsHandler')
            const adjController = new AdjustmentsController()
            await adjController.reCalculatePromoCodeDiscounts(data.agreementId, data.userId, transaction)
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
    async upsertCashAdvanceItem (data) {
        try {
            const finalResult = await models.sequelize.transaction(async (transaction) => {
                let result = await this._createOrUpdateCAI(data, transaction)
                // updating agreement totals.
                const agreementSummary = await models.Agreement.updateAndGetTotal(data.agreementId, data.userId, transaction)
                delete agreementSummary.id
                await ChangeLogController.addOrUpdateAction('add', result.id, 'AgreementCashAdvancedItem', transaction)
                return {
                    ...agreementSummary,
                    ...result
                }
            })
            const itemPriceDetail = await models.AgreementItemPrice.findOne({ where: { id: finalResult.agreementItemPriceId } })
            finalResult.agreementItemPriceDetails = itemPriceDetail
            return finalResult
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    /**
     *
     * @param {*} id of AgreementCashAdvancedItem
     */
    async getCashAdvanceItem (id, transaction) {
        try {
            const result = await models.AgreementCashAdvancedItem.findOne({
                where: { id, deletedAt: null, deletedBy: null },
                include: [{
                    model: models.AgreementItemPrice,
                    as: 'agreementItemPrice'
                }],
                transaction
            })
            if (result) {
                return result
            } else {
                throw new Error('ITEM_NOT_FOUND_OR_ITEM_REMOVED_FROM_AGREEMENT')
            }
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    /**
     *
     * @param {*} data to soft delete AgreementCashAdvancedItem by updating values in deletedby, deletedat, updatedby
     * @param {number} data.id id of the cashAdvanceItem to be updated
     * @param {number} data.agreementId id of the agreement to which the CAI is being added/updated
     * @param {number} data.userId id of the currently logged in user
     */
    async removeCashAdvanceItem (data) {
        try {
            const AgreementController = require('./agreementController')
            let cai = await this.getCashAdvanceItem(data.id)
            let inProgressAddendum
            const addendumController = new AddendumController(data.agreementId)
            inProgressAddendum = await addendumController.getInProgressAddendum()
            const agreementController = new AgreementController(data.agreementId)
            const agreement = await agreementController.getAgreementDetails()
            if (!data.addendumId) {
                data.addendumId = null
                if (agreement.status === 'Submitted' && (!inProgressAddendum || !data.addendumId)) {
                    throw new Error('AGREEMENT_ALREADY_COMPLETED')
                }
            } else if (data.addendumId !== inProgressAddendum.id) {
                throw new Error('ADDENDUM_ALREADY_COMPLETED')
            }
            const existingAgreementItem = await models.AgreementCashAdvancedItem.findOne({
                where: {
                    id: data.id
                },
                include: [{
                    model: models.AgreementItemPrice,
                    as: 'agreementItemPrice'
                }, {
                    model: models.LocationItem,
                    as: 'locationItem',
                    attributes: ['id', 'itemId'],
                    required: true,
                    include: [
                        {
                            model: models.Item,
                            attributes: ['id'],
                            required: true,
                            include: [
                                {
                                    model: models.ItemCategory,
                                    attributes: ['id', 'name'],
                                    required: true,
                                    include: [
                                        {
                                            model: models.ItemType,
                                            attributes: ['id', 'name']
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }]
            })

            const checkRequest = await models.CheckRequest.findOne({
                where: {
                    agreementCashAdvancedItemId: data.id
                }
            })

            /* If CAI has check request then that must be voided to delete CAI */
            if (checkRequest) {
                switch (checkRequest.status) {
                case 'processed':
                    throw new Error('CANT_DELETE_PROCESSED_CHECK_REQUEST_CASH_ADVANCED_ITEM')
                case 'voided':
                case 'toBeProcessed':
                    await models.sequelize.transaction(async (transaction) => {
                        await models.CheckRequest.update({
                            deletedBy: data.userId,
                            deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                            updatedBy: data.userId
                        }, {
                            where: { agreementCashAdvancedItemId: data.id },
                            transaction
                        })
                    })
                    break
                default:
                    break
                }
            }

            const finalResult = await models.sequelize.transaction(async (transaction) => {
                const result = await models.AgreementCashAdvancedItem.update({
                    deletedBy: data.userId,
                    deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                    updatedBy: data.userId
                }, {
                    where: { id: data.id },
                    transaction
                })
                if (result && result[0] > 0) {
                    // Recalculating the agreement adjustment promocode discounts
                    let AdjustmentsController = require('../adjustmentController/discountsAndAdjustmentsHandler')
                    const adjController = new AdjustmentsController()
                    await adjController.reCalculatePromoCodeDiscounts(data.agreementId, data.userId, transaction)
                    // updating agreement totals.
                    const agreementSummary = await models.Agreement.updateAndGetTotal(data.agreementId, data.userId, transaction, data.addendumId)
                    delete agreementSummary.id
                    // This is only for deleting Scheduled Services
                    const existingAgreementItemQuantity = _.get(existingAgreementItem, 'agreementItemPrice.quantity', 0)
                    let schedulingPayload = {
                        agreementCashAdvancedItemId: existingAgreementItem.id,
                        quantity: existingAgreementItemQuantity,
                        removeAll: true,
                        apiType: data.apiType,
                        itemCategoryName: existingAgreementItem.locationItem.Item.ItemCategory.ItemType.name,
                        merchandisesType: null
                    }
                    await SchedulingController.deleteScheduledFuneralServices(cai.agreementId, schedulingPayload, data.userId, data.timezone, transaction)
                    await ChangeLogController.addOrUpdateAction('remove', data.id, 'AgreementCashAdvancedItem', transaction)
                    return {
                        ...agreementSummary
                    }
                } else {
                    throw new Error('RECORD_NOT_FOUND')
                }
            })
            return finalResult
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    /**
     * List Cash Advanced items added to the agreement
     */
    async getAgreementCashAdvancedItems () {
        try {
            const query = ` SELECT aci.id,aci.formId,a.contractNumber AS agreementNumber, 'cashAdvancedItems' AS itemType, ad.addendumNumber, aci.locationItemId,aip.unitPrice,aci.note,aip.unitTax,aip.totalPrice,aip.totalTax,i.name,i.code, aip.quantity, 
            cr.status
                FROM AgreementCashAdvancedItem aci 
                INNER JOIN AgreementItemPrice aip ON aci.agreementItemPriceId=aip.id 
                INNER JOIN LocationItem li  ON li.id=aci.locationItemId 
                INNER JOIN Item i ON i.id=li.itemId 
                INNER JOIN Agreement a ON a.id = aci.agreementId  
                LEFT OUTER JOIN Addendum ad ON ad.id = aci.addendumId 
                LEFT OUTER JOIN CheckRequest cr on cr.AgreementCashAdvancedItemId = aci.id and (cr.deletedBy is null and cr.deletedAt is null)
                WHERE aci.agreementId=:agreementId AND aci.deletedAt IS NULL;`

            let result = await models.sequelize.query(query, {
                replacements: {
                    agreementId: this.agreementId
                },
                type: models.sequelize.QueryTypes.SELECT
            })
            result.map(m => {
                m.cashAdvancedCheckRequest = null
                if (m.status) {
                    m.cashAdvancedCheckRequest = {
                        status: m.status
                    }
                }
                delete m.status
            })
            return result
        } catch (err) {
            throw err
        }
    }

    /**
     *
     * @param {array} agreementCashAdvancedItemIds array of ids of the cashAdvanceItem to be updated
     * @param {number} agreementId id of the agreement to which the CAI is being added/updated
     * @param {number} userId id of the currently logged in user
     */
    async generateCashAdvanceItemsChequeRequest (agreementId, agreementCashAdvancedItemIds, currentUser) {
        let transaction
        try {
            const FormsController = require('../formsController/formsController')
            transaction = await models.sequelize.transaction()
            let checkAmount = 0
            let checkPayee = []
            let reason = []
            const agreementCashAdvancedItems = await Promise.all(agreementCashAdvancedItemIds.map(async (agreementCashAdvancedItemId) => {
                let item = await this.fetchItem(agreementCashAdvancedItemId, transaction)
                checkPayee.push(item.note)
                reason.push(`${item.agreementItemPrice.quantity}-${item.locationItem.Item.name}`)
                checkAmount += (item.agreementItemPrice.totalPrice + item.agreementItemPrice.totalTax)
                return item
            }))
            const agreementDetails = await models.Agreement.findOne({
                where: {
                    id: agreementId
                },
                include: [ {
                    model: models.Location,
                    as: 'location'
                }, {
                    model: models.AgreementPerson,
                    as: 'beneficiary',
                    include: [
                        {
                            model: models.Person,
                            as: 'person',
                            attributes: [
                                'id'
                            ]
                        }
                    ],
                    // where: { isOwner: true },
                    required: true
                }],
                transaction
            })

            let [fms] = await FormsController.getAllForms('CA Cheque Request')
            if (!fms || !fms.forms || !fms.forms.length) {
                throw new Error('FORM_NOT_FOUND')
            }
            let form = fms.forms[0]

            const createdForm = await FormsController.createCaseInfoFormsAndSendUsingDocusign(
                agreementDetails.beneficiary[0].person.id,
                [{
                    formId: form.id,
                    agreementId,
                    addendumId: null,
                    otherRecipients: [{
                        name: currentUser.name,
                        email: currentUser.email,
                        formRecipientRoleId: form.formRecipientRoles[0].id
                    }],
                    metaData: JSON.stringify(JSON.stringify({
                        CheckPayee: checkPayee.join(','),
                        CheckAmount: checkAmount.toFixed(2),
                        Reason: reason.join(',')
                    }))
                }],
                currentUser
            )
            await models.AgreementCashAdvancedItem.update({
                formId: createdForm[0].id
            }, {
                where: {
                    id: agreementCashAdvancedItemIds
                },
                transaction
            })
            await transaction.commit()
            return agreementCashAdvancedItems
        } catch (err) {
            await transaction.rollback()
            logger.error(err)
            throw err
        }
    }

    /**
     *
     * @param {number} id id of the cashAdvanceItem to be marked selected
     * @param {object} transaction sequelize transaction object
     */
    async fetchItem (id, transaction) {
        try {
            const result = await models.AgreementCashAdvancedItem.findOne({
                where: {
                    id
                },
                include: [{
                    model: models.AgreementItemPrice,
                    as: 'agreementItemPrice'
                }, {
                    model: models.LocationItem,
                    as: 'locationItem',
                    attributes: ['id', 'itemId'],
                    required: true,
                    include: [
                        {
                            model: models.Item,
                            attributes: ['id', 'name'],
                            required: true
                        }
                    ]
                }],
                transaction
            })
            if (!result) {
                throw new Error('ITEM_NOT_FOUND_OR_ITEM_REMOVED_FROM_AGREEMENT')
            }
            return result
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
}
module.exports = exports = AgreementCashAdvanceItemController
