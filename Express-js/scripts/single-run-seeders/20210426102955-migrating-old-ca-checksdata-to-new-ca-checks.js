'use strict'
const models = require('../../models')

module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {
            let query = `select 
        aci.id as cashAdvanceItemId, aci.formId, ci.id as caseInfoFormId, ci.status, ci.updatedAt 
        from AgreementCashAdvancedItem aci inner join 
        CaseInfoForm ci on aci.formId = ci.id where aci.formId is not null`
            let cashAdvanceItemsResult = await models.sequelize.query(query, {
                type: models.sequelize.QueryTypes.SELECT
            })

            let checkRequestObject = {
                agreementCashAdvancedItemId: null,
                status: '',
                vendorId: null,
                processedTime: null,
                voidedTime: null,
                createdBy: 1,
                updatedBy: 1,
                deletedAt: null,
                deletedBy: null
            }
            console.log(cashAdvanceItemsResult)
            await Promise.all(cashAdvanceItemsResult.map(async cai => {
                if (cai && (cai.status === 'inProgress' || cai.status === 'sent' || cai.status === 'Sent')) {
                    checkRequestObject.agreementCashAdvancedItemId = cai.cashAdvanceItemId
                    checkRequestObject.status = 'toBeProcessed'
                    await models.CheckRequest.create(checkRequestObject)
                } else if (cai && (cai.status === 'completed' || cai.status === 'Completed')) {
                    checkRequestObject.agreementCashAdvancedItemId = cai.cashAdvanceItemId
                    checkRequestObject.status = 'processed'
                    checkRequestObject.processedTime = cai.updatedAt
                    await models.CheckRequest.create(checkRequestObject)
                } else if (cai && (cai.status === 'voided' || cai.status === 'Voided')) {
                    checkRequestObject.agreementCashAdvancedItemId = cai.cashAdvanceItemId
                    checkRequestObject.status = 'voided'
                    checkRequestObject.voidedTime = cai.updatedAt
                    await models.CheckRequest.create(checkRequestObject)
                }
            }))
        } catch (error) {
            console.log(error)
            throw error
        }
    },

    down: (queryInterface, Sequelize) => {
    // As it is single time script there is nothing in down.
    }
}
