const logger = require('../../../lib/logger')
const { upsert } = require('../utils')
const models = require('../../../models')
const PurchaseOrderController = require('../purchaseOrderController/purchaseOrderController')
const _ = require('lodash')
class UrnInfoSectionController {
    /**
     * @param {*} data
     * @param {integer} data.id
     * @param {boolean} data.isFamilyOwnedUrn
     * @param {integer} data.resourceType
     * @param {integer} data.urnId
     * @param {string} data.height
     * @param {string} data.width
     * @param {string} data.depth
     * @param {integer} data.urnType
     * @param {string} data.urnStatus
     * @param {date} data.receivedDate
     * @param {boolean} data.isTransferRequired
     * @param {*} transaction
     * @param {integer} userId
     */
    async upsertUrnInfoSection (data, transaction, userId, type) {
        try {
            // TODO: if old record found with differnet urn id and new input's urnId is not matching then we need to send email to PO dept  --V2
            // TODO: if old record found with differnet urn id and new input's urnId is not matching then we need to send email to PO dept and donot change old casketId in existing record  --V2
            let urnDetails
            if (data.id) {
                urnDetails = await models.UrnInformationSection.findOne({ where: { id: data.id }, transaction })
            }
            const result = await upsert('UrnInformationSection', data, transaction)

            let itemUsageResourceTypeCheck = (data.resourceType === 'ItemUsage' || (data.isFamilyOwnedUrn && urnDetails && urnDetails.resourceType === 'ItemUsage'))

            let urnId = data.urnId || (data.isFamilyOwnedUrn && urnDetails && urnDetails.urnId)

            if (itemUsageResourceTypeCheck && type && (type === 'Cemetery' || type === 'Funeral')) {
                const nitemusage = await models.ItemUsage.findOne({
                    where: { id: urnId },
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
                    await PurchaseOrderController.createOrEditPurchaseOrderFromSchedulingHandler(data, transaction, userId, urnDetails)
                }
            }
            return result
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
}
module.exports = exports = UrnInfoSectionController
// async function getPurchaseOrder (urnDetails) {
//     const itemusage = await models.ItemUsage.findOne({ where: { id: urnDetails.urnId }, transaction })
// const resourceId = await models[itemusage.resourceType].findOne({ where: { id: itemusage.resourceId }, transaction })
// // check agreementMemorialId / agreementLocationItemId based on resourceType
// const itemType = itemusage.resourceType === 'AgreementLocationItem' ? 'agreementLocationItemId' : 'agreementMemorialItemId'
// const purchaseOrder = await models.PurchaseOrder.findOne({
//     where: {
//         [itemType]: resourceId.id
//     },
//     transaction
// })
// return purchaseOrder
// }
