'use strict';
const _ = require('lodash')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const models = require('../../models')
const logger = require('../../lib/logger');
const FinanceController = require('../../controllers/refactorControllers/financeController/financeOptionController')

module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {
            // Updating the isRecent in AgreementFinance table for the entires, whose isActive is 1.
            await models.AgreementFinance.update({
                isRecent: true
            }, {
                where: { isActive: true }
            })

            // Fetching the distinct agreement ids
            let distinctAgreementsQuery = `
            SELECT DISTINCT(agreementId) 
            FROM AgreementFinance
            WHERE isActive = 0`

            let distinctAgreements = await models.sequelize.query(distinctAgreementsQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })

            let agmtFinIds = []

            // Fetching agreement finance entries, whose immediate entry is a re-financing type.
            await Promise.all(distinctAgreements.map(async agreement => {
                // If immediate record with same agreementId is having financeType as Re-Finance and isActive
                // Then this record must be updated with isActive = true and isRecent = false
                let agmtCheckQuery = `
                SELECT *
                FROM AgreementFinance
                WHERE agreementId =:agreementId
                ORDER BY id DESC`

                let agreementCheck = await models.sequelize.query(agmtCheckQuery, {
                    type: models.sequelize.QueryTypes.SELECT,
                    replacements: {
                        agreementId: agreement.agreementId
                    }
                })

                if (_.get(agreementCheck, '[0].isActive', false) === true && _.get(agreementCheck, '[0].isRecent', false) === true && _.get(agreementCheck, '[0].financeType') === 'Refinance') {
                    agreementCheck.forEach((fin, index) => {
                        if (_.get(fin, 'financeType') === 'Refinance') agmtFinIds.push(_.get(agreementCheck, `[${index + 1}].id`, null))
                    })
                }

                return agreementCheck
            }))

            // Removing null values from the agreementFinanceIds array
            agmtFinIds = _.compact(agmtFinIds)

            console.log('AgreementFinanceIds', agmtFinIds)
            console.log('AgreementFinanceIdsLength', agmtFinIds.length)

            // Updating isActive to 1 for agreement finance entries, whose immediate entry is a re-financing type.
            await models.AgreementFinance.update({
                isActive: true,
                isRecent: false
            }, {
                where: {
                    id: {
                        [Op.in]: agmtFinIds
                    }
                }
            })

            // Updating the isRecent to false from null.
            await models.AgreementFinance.update({
                isRecent: false
            }, {
                where: { isRecent: null }
            })

            // For all the Agreement Finance records(except revoked) in DB update remainingInterest and remainingBalance columns
            // due column in Agreement table
            let allAgmtFin = await models.AgreementFinance.scope(['withFinanceSchedule', 'withApproval']).findAll({
                where: { isActive: true },
                attributes: ['id', 'agreementId', 'remainingBalance', 'remainingInterest', 'interestAmount', 'financedAmount'],
                order: [
                    [
                        { model: models.AgreementFinanceSchedule, as: 'agreementFinanceSchedule' },
                        'paymentIndex',
                        'ASC'
                    ]
                ]
            })

            await Promise.all(allAgmtFin.map(async fin => {
                let remainingBalance = fin.financedAmount
                let remainingInterest = fin.interestAmount
                fin.agreementFinanceSchedule.forEach(async finSched => {
                    const financeCtrl = new FinanceController(fin.agreementId)
                    const totalPaidEMI = await financeCtrl.getTotalPaidForEMI(finSched.id)
                    const emiInterest = finSched.interest
                    remainingInterest -= totalPaidEMI < emiInterest ? totalPaidEMI : emiInterest
                    remainingBalance -= totalPaidEMI < emiInterest ? 0 : (totalPaidEMI - emiInterest)
                })
                fin.remainingBalance = remainingBalance < 0 ? 0 : remainingBalance.toFixed(2)
                fin.remainingInterest = remainingInterest.toFixed(2)
                await fin.save()
                await models.Agreement.updateTotalPaidAndDue(fin.agreementId, 1)
                return fin
            }))
        } catch (error) {
            console.log(error)
            logger.error(error)
            throw error
        }
    },

    down: async (queryInterface, Sequelize) => {
        // No actions to be done in the down 
    }
};
