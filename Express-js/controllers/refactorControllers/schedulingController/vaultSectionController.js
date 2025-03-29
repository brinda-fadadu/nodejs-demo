const logger = require('../../../lib/logger')
const { upsert } = require('../utils')
const models = require('../../../models')
const PurchaseOrderController = require('../purchaseOrderController/purchaseOrderController')
const _ = require('lodash')

class VaultSectionController {
    /**
     * @param {*} data
     * @param {integer} data.id
     * @param {boolean} data.isVaultFromDisinterment
     * @param {string} data.resourceType
     * @param {integer} data.vaultId
     * @param {string} data.disinteredVaultDetails
     * @param {*} transaction
     * @param {integer} userId
     */
    async upsertVaultSection (data, transaction, userId, type) {
        try {
            // TODO: if old record found with differnet vault id and new input's vaultId is not matching then we need to send email to PO dept --V2
            // TODO: if old record found with differnet vault id and new input's vaultId is not matching then we need to send email to PO dept and donot change old casketId in existing record. --V2
            let vaultDetails
            if (data.id) {
                vaultDetails = await models.VaultSection.findOne({ where: { id: data.id }, transaction })
            }
            const result = await upsert('VaultSection', data, transaction)

            let itemUsageResourceTypeCheck = (data.resourceType === 'ItemUsage' || (data.isVaultFromDisinterment && vaultDetails && vaultDetails.resourceType === 'ItemUsage'))

            let vaultId = data.vaultId || (data.isVaultFromDisinterment && vaultDetails && vaultDetails.vaultId)

            if (itemUsageResourceTypeCheck && type && type === 'Cemetery') {
                const nitemusage = await models.ItemUsage.findOne({
                    where: { id: vaultId },
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
                    await PurchaseOrderController.createOrEditPurchaseOrderFromSchedulingHandler(data, transaction, userId, vaultDetails)
                }
            }
            return result
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
}
module.exports = exports = VaultSectionController
