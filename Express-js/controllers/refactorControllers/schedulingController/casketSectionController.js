const logger = require('../../../lib/logger')
const { upsert } = require('../utils')
const models = require('../../../models')
const PurchaseOrderController = require('../purchaseOrderController/purchaseOrderController')
const _ = require('lodash')

class CasketSectionController {
    /**
     * @param {*} data
     * * @param {integer} data.id
     * @param {integer} data.isOutSideCasket
     * @param {string} data.resourceType
     * @param {integer} data.casketId
     * @param {string} data.casketType
     * @param {*} transaction
     * @param {integer} userId
     */
    async upsertCasketSection (data, transaction, userId, type) {
        try {
            // TODO: if old record found with differnet casket id and new input's casketId is not matching then we need to send email to PO dept --V2
            // TODO: if old record found with differnet casket id and new input's casketId is not matching then we need to send email to PO dept and donot change old casketId in existing record  --V2
            let casketDetails
            if (data.id) {
                casketDetails = await models.CasketSection.findOne({ where: { id: data.id }, transaction })
            }
            const result = await upsert('CasketSection', data, transaction)

            let itemUsageResourceTypeCheck = (data.resourceType === 'ItemUsage' || (data.isOutSideCasket && casketDetails && casketDetails.resourceType === 'ItemUsage'))

            let casketId = data.casketId || (data.isOutSideCasket && casketDetails && casketDetails.casketId)

            if (itemUsageResourceTypeCheck && type && (type === 'Cemetery' || type === 'Funeral')) {
                const nitemusage = await models.ItemUsage.findOne({
                    where: { id: casketId },
                    include: [{
                        model: models.AgreementLocationItem,
                        as: 'agreementItems',
                        include: [{
                            model: models.Agreement,
                            as: 'agreementDetails',
                            include: [{
                                model: models.SaleType,
                                as: 'saleType'
                            }]
                        }]
                    }],
                    transaction
                })
                let itemsAgreementType = _.get(nitemusage, 'agreementItems.agreementDetails.type')
                let itemsSaleTypeAgreementType = _.get(nitemusage, 'agreementItems.agreementDetails.saleType.agreementType', null)
                /** Note: Create purchase order for anything other than miscellaneous sales, or for those miscellaneous sales whose
                sale type is of cemetery type. */
                if ((itemsAgreementType !== 5) || ((itemsAgreementType === 5) && (itemsSaleTypeAgreementType === 2))) {
                    await PurchaseOrderController.createOrEditPurchaseOrderFromSchedulingHandler(data, transaction, userId, casketDetails)
                }
                // const nitemusage = await models.ItemUsage.findOne({ where: { id: data.urnId }, transaction })
                // const nresourceId = await models[nitemusage.resourceType].findOne({ where: { id: nitemusage.resourceId }, transaction })
                // // check agreementMemorialId / agreementLocationItemId based on resourceType
                // const nitemType = nitemusage.resourceType === 'AgreementLocationItem' ? 'agreementLocationItemId' : 'agreementMemorialItemId'
                // const payload = { [nitemType]: nresourceId.id, itemUsageId: nitemusage.id }
                // if (urnDetails && urnDetails.urnId !== data.urnId) {
                //     // delete/update old po
                //     const itemusage = await models.ItemUsage.findOne({ where: { id: urnDetails.urnId }, transaction })
                //     const resourceId = await models[itemusage.resourceType].findOne({ where: { id: itemusage.resourceId }, transaction })
                //     // check agreementMemorialId / agreementLocationItemId based on resourceType
                //     const itemType = itemusage.resourceType === 'AgreementLocationItem' ? 'agreementLocationItemId' : 'agreementMemorialItemId'
                //     const purchaseOrder = await models.PurchaseOrder.findOne({
                //         where: {
                //             [itemType]: resourceId.id
                //         },
                //         transaction
                //     })
                //     // delete
                //     const deletePayload = {
                //         id: purchaseOrder.id,
                //         deletedAt: new Date(),
                //         deletedBy: userId
                //     }
                //     await PurchaseOrderController.deletePurchaseOrder(deletePayload, userId, transaction)
                //     // creating
                //     await PurchaseOrderController.createOrEditPurchaseOrder(payload, { id: userId }, transaction)
                // }
                // if (!data.id) {
                //     await PurchaseOrderController.createOrEditPurchaseOrder(payload, { id: userId }, transaction)
                // }
            }
            return result
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
}
module.exports = exports = CasketSectionController
