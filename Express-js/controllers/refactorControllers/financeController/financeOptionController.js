const models = require('../../../models')
const logger = require('../../../lib/logger')
const moment = require('moment')
const { Op } = require('sequelize')
const _ = require('lodash')
const { loanDetails } = require('../../../utils/emilCalculation')
const AddendumController = require('../agreementController/addendum')
// const AgreementController = require('../agreementController/agreementController')
const ApprovalsController = require('../adjustmentController/approvalsController')
const { getNetPropertyPrice } = require('../utils')

const FINANCE_TYPE = {
    FINANCE: 'Finance',
    REFINANCE: 'Refinance',
    SPECIAL_EQUAL: 'Special-equal',
    SPECIAL_UNEQUAL: 'Special-unequal'
}

const funeralTrustSalesTypeCode = ['AFCTS', 'CFT', 'CFTGA', 'MEMBERSHIP', 'TPI']

class FinanceController {
    constructor (agreementId, addendumId) {
        this.agreementId = agreementId
        this.addendumId = addendumId
    }

    /**
     * Checks the agreement type for the financing
     * @param {*} apiType is to check request came from sales-app
     */
    async checkAgreementType (apiType) {
        const AgreementController = require('../agreementController/agreementController')
        const funeralTrustSalesType = await models.SaleType.findAll({
            where: {
                code: {
                    [Op.in]: funeralTrustSalesTypeCode
                }
            },
            attributes: ['id']
        })
        const funeralTrustSalesTypeIds = funeralTrustSalesType.map(model => model.id)
        const agreement = await models.Agreement.findOne({ where: { id: this.agreementId } })
        // AN funeral financing is not allowed
        // PN funeral financing apart from funeral trusts are not allowed
        if (agreement.type === AgreementController.TYPES['Funeral'] && (agreement.needType === AgreementController.NEED_TYPES['AN'] ||
            (agreement.needType === AgreementController.NEED_TYPES['PN'] && (!funeralTrustSalesTypeIds.includes(agreement.saleTypeId) && apiType !== 'quotation')))) {
            throw new Error('FINANCE_NOT_ALLOWED_FOR_THIS_AGREEMENT_TYPE')
        }
    }

    /**
     * Get the list of financing options available in the system
     */
    static async listFinancingOptions () {
        const financingOptions = await models.FinanceOption.findAll({})
        return financingOptions
    }

    _checkExistingFinance (existingAgreementFinance) {
        const statusChecks = [
            ApprovalsController.ApprovalStatus['Declined'],
            ApprovalsController.ApprovalStatus['AutoDeclined']
        ]
        if (existingAgreementFinance) {
            if (existingAgreementFinance.approval && statusChecks.includes(existingAgreementFinance.approval.status)) {
                throw new Error('AT_MOST_ONE_AGREEMENT_FINANCE')
            }
            throw new Error('AT_MOST_ONE_AGREEMENT_FINANCE')
        }
    }

    /**
     * Get the calculated repayment schedule based on items you have selected
     * @param {object} data has totalPrincipal, interestRate, tenureMonths, paymentsPerYear
     * @param {*} isFinalizingReq is the boolean value which tells this method is called for Finalizing Finance API or Calculate API
     */
    static async calculateRepaymentSchedule (data, isFinalizingReq, isOnlyDiscountApplied, isPIFApplied, transaction) {
        const { tenureMonths, paymentsPerYear, isACHPayment, financeType } = data
        let repaymentSchedule = {}
        let installmentsNumber = tenureMonths
        if (paymentsPerYear) {
            installmentsNumber = (tenureMonths / 12) * paymentsPerYear
        }
        if (financeType === FINANCE_TYPE.FINANCE && isFinalizingReq && !isOnlyDiscountApplied && tenureMonths >= 12 && !isPIFApplied) {
            // Fetch Financing and ACH Discounts
            const finDiscDetails = await FinanceController.fetchFinancingDiscountDetails(data.agreementId, data.addendumId, data.downPaymentPercent, tenureMonths, transaction)
            if (finDiscDetails) {
            // Calculate discount amount
                const discPercentage = isACHPayment ? finDiscDetails.financingDiscount + finDiscDetails.achDiscount : finDiscDetails.financingDiscount
                const discountAmount = Math.fround((finDiscDetails.netPropertyPrice) * discPercentage / 100).toFixed(2)
                data.totalPrincipal = data.totalPrincipal - discountAmount
                if (data.totalPrincipal <= 0) {
                    throw new Error('FINANCE_AMOUNT_MUST_BE_POSITIVE_INTEGER')
                }
                repaymentSchedule.netPropertyPrice = finDiscDetails.netPropertyPrice
                repaymentSchedule.financingDiscount = Math.fround(finDiscDetails.netPropertyPrice * finDiscDetails.financingDiscount / 100)
                if (isACHPayment) {
                    repaymentSchedule.achDiscount = Math.fround(finDiscDetails.netPropertyPrice * finDiscDetails.achDiscount / 100)
                }
            }
        }
        data.installmentsNumber = installmentsNumber

        /* let agreementFinanceScheduleQuery = `
        SELECT afs.expectedPaymentDate FROM AgreementFinanceSchedule AS afs INNER JOIN AgreementFinance AS af ON afs.agreementFinanceId = af.id AND af.agreementId = :agreementId AND af.isActive = 1 AND af.isRecent = 1
        `
        let agreementFinanceScheduleData = []
        if (data.agreementId) {
            const addendumId = await models.sequelize.query(`SELECT TOP 1 id FROM Addendum WHERE agreementId= :agreementId ORDER BY id DESC`, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: data.agreementId
                },
                transaction
            })

            if (addendumId.length > 0) {
                agreementFinanceScheduleData = await models.sequelize.query(`${agreementFinanceScheduleQuery} AND af.addendumId = :addendumId`, {
                    type: models.sequelize.QueryTypes.SELECT,
                    replacements: {
                        agreementId: data.agreementId,
                        addendumId: addendumId[0].id
                    },
                    transaction
                })
            } else {
                agreementFinanceScheduleData = await models.sequelize.query(agreementFinanceScheduleQuery, {
                    type: models.sequelize.QueryTypes.SELECT,
                    replacements: {
                        agreementId: data.agreementId
                    },
                    transaction
                })
            }
        } */
        const loanData = loanDetails(data)
        return {
            ...repaymentSchedule,
            ...loanData
        }
    }

    static async fetchFinancingDiscountDetails (agreementId, addendumId, downPayment, tenureMonths, transaction) {
        // Fetch Financing and ACH Discounts percentage
        const discDetails = await models.FinanceMemo.findOne({
            where: {
                years: Math.ceil(tenureMonths / 12),
                minDownPayment: { [Op.lte]: downPayment },
                maxDownPayment: { [Op.gt]: downPayment }
            },
            transaction
        })
        if (discDetails) {
            const netPropertyPrice = await getNetPropertyPrice({ agreementId, addendumId: addendumId || null }, transaction)
            return { netPropertyPrice: netPropertyPrice.netPropertyPriceWithoutECF, financingDiscount: discDetails.financingDiscount, achDiscount: discDetails.achDiscount }
        } else {
            return null
        }
    }

    /**
     * Create a payload for agreement finance
     * @param {object} data agreement finance record details
     */
    _createPayloadForAgreementFinance (data) {
        const totalAmountValue = (_.get(data, 'totalPrincipal', 0) * 1) + (_.get(data, 'downPaymentAmount', 0) * 1)
        return {
            // status: data.status || STATUSES.APPROVED,
            isActive: data.isActive || true,
            addendumId: this.addendumId,
            agreementId: this.agreementId,
            financeType: data.financeType || FINANCE_TYPE.FINANCE,
            totalAmount: _.get(data, 'totalAmount', totalAmountValue).toFixed(2),
            totalOfPayments: _.get(data, 'totalAmount', 0).toFixed(2),
            interestRate: _.get(data, 'interestRate', 0).toFixed(2),
            tenureMonths: data.tenureMonths,
            financedAmount: _.get(data, 'financedAmount', 0).toFixed(2),
            interestAmount: _.get(data, 'interestAmount', 0).toFixed(2),
            paymentsPerYear: data.paymentsPerYear || 12,
            downPaymentAmount: _.get(data, 'downPaymentAmount', 0).toFixed(2),
            downPaymentPercent: _.get(data, 'downPaymentPercent', 0).toFixed(2),
            remainingBalance: _.get(data, 'remainingBalance', 0).toFixed(2),
            updatedAt: moment().format('YYYY/MM/DD HH:mm:ss'),
            createdAt: moment().format('YYYY/MM/DD HH:mm:ss'),
            repaymentAmount: _.get(data, 'installments[0].expectedPaymentAmount'),
            createdBy: data.currentUser.id,
            updatedBy: data.currentUser.id,
            isACHPayment: data.isACHPayment
        }
    }

    /**
     *  Used for financing/refinancing finalizing (private method)
     *  @param {Object<{totalPrincipal: Number, interestRate: NUmber, tenureMonths: Number, downPayment: Number, downPaymentPercent: Number, agreementId: Number}>} data
     *  @param {object} transaction DB transaction
     *  Returns Agreement finance details
     */
    async _finalizeFinance (data, transaction) {
        let AdjustmentsController = require('../adjustmentController/discountsAndAdjustmentsHandler')
        let DiscountsAndAdjustmentsHandler = new AdjustmentsController()
        const existingAgreementFinance = await this.getAgreementFinance(false, transaction)
        this._checkExistingFinance(existingAgreementFinance)
        if (existingAgreementFinance && !data.financeType) {
            data.financeType = existingAgreementFinance.financeType
        }
        data.agreementId = this.agreementId
        const isOnlyDiscountApplied = await DiscountsAndAdjustmentsHandler.getIsOnlyDiscountForAgreement(this.agreementId, transaction)
        const PIFDiscount = await DiscountsAndAdjustmentsHandler.getPIFDiscountForAgreement(this.agreementId, this.addendumId || null, transaction)
        let isPIFApproved = null
        if (PIFDiscount) {
            isPIFApproved = ApprovalsController.ApprovalStatusStr(PIFDiscount.approval ? PIFDiscount.approval.status : null)
        }
        const isPIFApplied = isPIFApproved === 'Approved' || isPIFApproved === 'Auto Approved'
        const repaymentSchedule = await FinanceController.calculateRepaymentSchedule(data, true, isOnlyDiscountApplied, isPIFApplied, transaction)
        const payload = this._createPayloadForAgreementFinance({
            ...data,
            totalAmount: repaymentSchedule.sum,
            financedAmount: repaymentSchedule.principalSum,
            interestAmount: repaymentSchedule.interestSum,
            remainingBalance: repaymentSchedule.principalSum
        })
        payload.remainingInterest = repaymentSchedule.interestSum
        payload.ppifAmount = data.ppifAmount
        payload.notes = data.notes
        const agreementFinance = await models.AgreementFinance.create(payload, { transaction })
        const installments = repaymentSchedule.installments.map(eachInstallment => {
            return {
                ...eachInstallment,
                agreementFinanceId: agreementFinance.id,
                createdBy: data.currentUser.id,
                updatedBy: data.currentUser.id,
                remainingInterestToBePaid: eachInstallment.interest
            }
        })
        await models.AgreementFinanceSchedule.bulkCreate(installments, { transaction })
        if (data.financeType !== FINANCE_TYPE.SPECIAL_EQUAL) {
            await models.Agreement.updateAndGetTotal(this.agreementId, data.currentUser.id, transaction)
        }
        // repaymentSchedule.netPropertyPrice, repaymentSchedule.financingDiscount, repaymentSchedule.achDiscount
        if (repaymentSchedule.netPropertyPrice && repaymentSchedule.financingDiscount && data.financeType === FINANCE_TYPE.FINANCE) {
            // Add Finance Discount Here
            await DiscountsAndAdjustmentsHandler.applyAdjustment({ title: 'Finance Discount', agreementId: this.agreementId, addendumId: this.addendumId, createdBy: data.currentUser.id, amount: repaymentSchedule.financingDiscount, apiType: data.apiType }, transaction)
            if (repaymentSchedule.achDiscount) {
                // Add ACH Discount Herex
                await DiscountsAndAdjustmentsHandler.applyAdjustment({ title: 'Automatic Payment Discount', agreementId: this.agreementId, addendumId: this.addendumId, createdBy: data.currentUser.id, amount: repaymentSchedule.achDiscount, apiType: data.apiType }, transaction)
            }
        }
        return agreementFinance
    }

    /**
     *  Finalizes the finance method to the agreement (public method)
     *  @param {Object<{totalPrincipal: Number, interestRate: NUmber, tenureMonths: Number, downPayment: Number, downPaymentPercent: Number, agreementId: Number}>} data
     *  Returns Agreement finance details
     */
    async finalizeFinance (data) {
        let transaction
        try {
            transaction = await models.sequelize.transaction()
            const AgreementController = require('../agreementController/agreementController')

            const agreementController = new AgreementController(this.agreementId)
            // Checking the existence of agreement
            await agreementController.getAgreementDetails(transaction)
            // Checking existing finance and making isRecent false in case of addendum if previousDue is 0
            if (data.addendumId) {
                const addendumController = new AddendumController(this.agreementId, this.addendumId)
                await addendumController.getAddendumDetails(transaction)
                let agreementFinance = await this.getAgreementFinance(false, transaction)
                if (agreementFinance) {
                    agreementFinance.isRecent = false
                    agreementFinance = await agreementFinance.save({ transaction })
                }
            }
            const agreementFinance = await this._finalizeFinance(data, transaction)
            await transaction.commit()
            return agreementFinance
        } catch (error) {
            await transaction.rollback()
            throw error
        }
    }

    /**
     * get details of agreement finance
     * @param {boolean} isScheduleRequired bool for schedule details required or not
     * @param {object} transaction DB transaction
     */
    async getAgreementFinance (isScheduleRequired = true, transaction) {
        /* let query = `SELECT * FROM AgreementFinance af
        LEFT JOIN Approval a ON a.resourceId = af.id
        WHERE af.agreementId = ${this.agreementId} AND af.isActive = 1 AND af.isRecent = 1`

        if (isScheduleRequired) {
            query = `SELECT * FROM AgreementFinance af
            LEFT JOIN Approval a ON a.resourceId = af.id
            INNER JOIN AgreementFinanceSchedule afs ON afs.agreementFinanceId = af.id
            WHERE af.agreementId = ${this.agreementId} AND af.isActive = 1 AND af.isRecent = 1
            ORDER BY afs.paymentIndex ASC`
        }
        let agreementFinance = await models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT, transaction }) */

        const where = { agreementId: this.agreementId, isActive: true, isRecent: true }
        let query = { where }
        const scope = ['withApproval']
        if (isScheduleRequired) {
            scope.push('withFinanceSchedule')
            query.order = [
                [
                    { model: models.AgreementFinanceSchedule, as: 'agreementFinanceSchedule' },
                    'paymentIndex',
                    'ASC'
                ]
            ]
        }
        query.transaction = transaction
        const agreementFinance = await models.AgreementFinance.scope(scope).findOne(query)
        return agreementFinance
    }

    /**
     * get details of defaulted interest amount for the agreement finance id
     * @param {object} agreementFinance DB transaction
     * @param {string} recievedDate
     * @param {*} transaction
     */
    async getDefaultedInterestAmountDetails (agreementFinance, receivedDate = false, transaction) {
        const currentMonth = receivedDate ? moment(receivedDate).format('MM') : moment().format('MM')
        const currentYear = receivedDate ? moment(receivedDate).format('YYYY') : moment().format('YYYY')
        const currentDay = receivedDate ? moment(receivedDate).format('DD') : moment().format('DD')
        // Checking if there any defaulted interest amount for the past scheduled period.
        let defaultedInterestAmountQuery = `
        SELECT id, remainingInterestToBePaid AS needToPay
        FROM AgreementFinanceSchedule
        WHERE remainingInterestToBePaid > 0
        AND agreementFinanceId =:agreementFinanceId
        AND CAST(AgreementFinanceSchedule.expectedPaymentDate as date) < (
            SELECT TOP 1 CAST(AgreementFinanceSchedule.expectedPaymentDate as date)
            FROM AgreementFinanceSchedule
            WHERE agreementFinanceId =:agreementFinanceId
            AND YEAR(AgreementFinanceSchedule.expectedPaymentDate) <=:currentYear
            AND MONTH(AgreementFinanceSchedule.expectedPaymentDate) <=:currentMonth
            AND DAY(AgreementFinanceSchedule.expectedPaymentDate) <=:currentDay
            ORDER BY AgreementFinanceSchedule.id desc
        ) ORDER BY id ASC
        `

        let defaultInterestAmount = await models.sequelize.query(defaultedInterestAmountQuery, {
            type: models.sequelize.QueryTypes.SELECT,
            replacements: {
                currentMonth: Number(currentMonth),
                currentYear: Number(currentYear),
                currentDay: Number(currentDay),
                agreementFinanceId: agreementFinance.id
            },
            transaction
        })

        return defaultInterestAmount
    }

    /**
     * add payment id to agreementFinanceSchedulePayment and update remainingBalance
     * @param {object} payment id of the subsequent payment
     * @param {number} paymentAmount amount paid to that particular payment
     * @param {boolean} paymentBeforeScheduleStarts amount paid to that particular payment
     * @param {boolean} calledFromLinkedContract amount paid to that particular payment
     */
    async addPaymentToSchedule (payment, paymentAmount, transaction, paymentBeforeScheduleStarts = false, calledFromLinkedContract = false) {
        logger.info(`Payment linking to finance ${new Date()}`)
        const agreementFinance = await this.getAgreementFinance(false, transaction)
        let AgreementFinanceRemainingBalance = null
        let AgreementFinanceRemainingInterest = null
        if (agreementFinance) {
            AgreementFinanceRemainingBalance = calledFromLinkedContract && agreementFinance.remainingBalance === null ? agreementFinance.financedAmount : agreementFinance.remainingBalance
            AgreementFinanceRemainingInterest = calledFromLinkedContract && agreementFinance.remainingInterest === null ? agreementFinance.interestAmount : agreementFinance.remainingInterest
        }
        let isApproved
        if (agreementFinance && ['Finance', 'Refinance'].includes(agreementFinance.financeType)) {
            isApproved = true
        } else if (agreementFinance && ['Special-equal', 'Special-unequal'].includes(agreementFinance.financeType)) {
            let apprStatus = ApprovalsController.ApprovalStatusStr(_.get(agreementFinance, 'approval.status')) === 'Approved'
            isApproved = !!(apprStatus && agreementFinance.approval.resourceType === 'AgreementFinance')
        }
        if (!agreementFinance || (agreementFinance && AgreementFinanceRemainingBalance === 0) || !isApproved) {
            // return if there is no active financing
            logger.info(`Agreement finance/active finance not present ${new Date()}`)
            return
        }
        logger.info(`Payment started for Agreement: ${this.agreementId} with payment id ${payment.id}`)
        // If payment is made before 1st emi expected date
        // remove paymentAmount directly from remainingPrincipal
        const agreementFinanceSchedule = await this.getPresentFinanceSchedule(agreementFinance.id, transaction)
        logger.info(`Present finance schedule: ${agreementFinanceSchedule}`)
        logger.info(`paymentBeforeScheduleStarts: ${paymentBeforeScheduleStarts}`)
        if (agreementFinanceSchedule && !paymentBeforeScheduleStarts) {
            logger.info(`Agreement finance sched present ${new Date()}`)
            // Paid Amount should be first deducted from the remaining interest and then deducted from remaining balance if any extra amount
            let defaultInterestAmount = await this.getDefaultedInterestAmountDetails(agreementFinance, _.get(agreementFinanceSchedule, 'expectedPaymentDate'), transaction)
            /**
             * If there are defaulted interest amounts in the past scheduled periods, that amount will be subtracted from the
             * current payment that is being made and the rest will be subtracted from the current schedules interest and due
             * if there are any amount left.
             */
            if (defaultInterestAmount.length && paymentAmount > 0) {
                logger.info(`Payment started for defaulted interest amount for Agreement: ${this.agreementId} with payment id ${payment.id}`)
                let remainingInterest = AgreementFinanceRemainingInterest
                logger.info(`Agreement finance remaining balance: ${AgreementFinanceRemainingBalance}`)
                logger.info(`Agreement finance remaining interest: ${AgreementFinanceRemainingInterest}`)
                await Promise.all(defaultInterestAmount.map(async (item) => {
                    if (paymentAmount > 0) {
                        let amountPaid = paymentAmount > item.needToPay ? item.needToPay : paymentAmount
                        remainingInterest -= amountPaid
                        paymentAmount -= amountPaid

                        /* await models.AgreementFinanceSchedule.update({
                            remainingInterestToBePaid: item.needToPay - amountPaid
                        }, {
                            where: { id: item.id },
                            transaction
                        }) */
                        let remainingInterestToBePaid = item.needToPay - amountPaid
                        await models.sequelize.query(`UPDATE AgreementFinanceSchedule SET remainingInterestToBePaid = ${remainingInterestToBePaid} WHERE id = ${item.id}`, {
                            transaction,
                            type: models.sequelize.QueryTypes.UPDATE
                        })
                    }
                }))

                await models.sequelize.query(`UPDATE AgreementFinance SET remainingInterest = ${remainingInterest} WHERE id = ${agreementFinance.id}`, {
                    transaction,
                    type: models.sequelize.QueryTypes.UPDATE
                })

                logger.info(`Payment amount after defaulted: ${paymentAmount}`)
                logger.info(`Remaining interest after defaulted: ${remainingInterest}`)
                paymentAmount = paymentAmount > 0 ? paymentAmount : 0
                AgreementFinanceRemainingInterest = remainingInterest
                logger.info(`Payment completed for defaulted interests for Agreement: ${this.agreementId} with payment id ${payment.id}`)
            }

            if (paymentAmount > 0) {
                logger.info(`Payment started for the current payment schedule for Agreement: ${this.agreementId} with payment id ${payment.id}`)
                let remInterest = agreementFinanceSchedule.remainingInterestToBePaid || 0
                let remainingBalance = AgreementFinanceRemainingBalance
                let remainingInterest = AgreementFinanceRemainingInterest
                if (remInterest > 0) {
                    remainingInterest = remInterest - paymentAmount >= 0 ? AgreementFinanceRemainingInterest - paymentAmount : AgreementFinanceRemainingInterest - remInterest
                    remainingBalance = remInterest - paymentAmount < 0 ? (AgreementFinanceRemainingBalance - (paymentAmount - remInterest)) : AgreementFinanceRemainingBalance

                    await models.AgreementFinanceSchedule.update({
                        remainingInterestToBePaid: remInterest - paymentAmount > 0 ? remInterest - paymentAmount : 0
                    }, {
                        where: { id: agreementFinanceSchedule.id },
                        transaction
                    })
                } else {
                    remainingBalance -= paymentAmount
                }

                remainingBalance = remainingBalance < 0 ? 0 : remainingBalance
                logger.info(`Remaining Balance in the present schedule: ${remainingBalance}`)
                logger.info(`Remaining Interest in the present schedule: ${remainingInterest}`)
                await models.sequelize.query(`UPDATE AgreementFinance SET remainingBalance=${remainingBalance}, remainingInterest = ${remainingInterest} WHERE id = ${agreementFinance.id}`, {
                    transaction,
                    type: models.sequelize.QueryTypes.UPDATE
                })
                logger.info(`Payment completed for the current payment schedule for Agreement: ${this.agreementId} with payment id ${payment.id}`)
            }
            // creating the record in AgreementFinanceSchedulePayment table
            await models.AgreementFinanceSchedulePayment.create({
                paymentId: payment.id,
                agreementFinanceScheduleId: agreementFinanceSchedule.id
            }, { transaction })
            logger.info(`Payment completed for Agreement: ${this.agreementId} with payment id ${payment.id}`)
        } else {
            logger.info(`Agreement finance sched not present ${new Date()}`)
            const downPayment = agreementFinance.downPaymentAmount
            // Fetch all successful payments done after financing
            // If total of payments is greater than down payment then subtract from remaining balance
            const pmtsTotal = await this.getTotalOfPaymentsAfterFinancing(payment.id, agreementFinance.agreementId, agreementFinance.createdAt, transaction)
            /** Added a condition, to check that if the payment amount subtracted with the remaining amount to be paid as downpayment
            should be greater than zero for the leftover amount to be subtracted from remaining balance. */
            let remainingBalance = AgreementFinanceRemainingBalance
            logger.info(`REMAINING BALANCE FROM EARLY PAYMENT - BEFORE DEDUCTING THE PAYMENT: ${remainingBalance}`)
            let amountToBeSubtracted = (paymentAmount - (downPayment - pmtsTotal)) > 0 ? (paymentAmount - (downPayment - pmtsTotal)) : 0
            remainingBalance -= pmtsTotal < downPayment ? amountToBeSubtracted : paymentAmount
            remainingBalance = remainingBalance < 0 ? 0 : remainingBalance
            logger.info(`REMAINING BALANCE FROM EARLY PAYMENT: ${remainingBalance}`)
            // await agreementFinance.save({ transaction })
            await models.sequelize.query(`UPDATE AgreementFinance SET remainingBalance=${remainingBalance} WHERE id = ${agreementFinance.id}`, {
                transaction,
                type: models.sequelize.QueryTypes.UPDATE
            })
            logger.info(`Agreement finance sched not present calc part done ${new Date()}`)
        }
    }

    /**
     *  requesting refinancing on any agreement
     *  @param {number} tenureInMonths number of months, refinancing is opted for
     *  Returns Agreement finance details
     */
    async refinancing (data) {
        let transaction
        try {
            transaction = await models.sequelize.transaction()
            const { tenureMonths, totalPrincipal } = data
            if (!this.agreementId || !this.addendumId) {
                throw new Error('ADDENDUM_NOT_FOUND')
            }
            const addendumController = new AddendumController(this.agreementId, this.addendumId)
            await addendumController.getAddendumDetails(transaction)
            const agreementFinance = await this.getAgreementFinance(false, transaction)
            if (!agreementFinance) {
                throw new Error('AGREEMENT_FINANCE_NOT_FOUND')
            }
            if (!tenureMonths || agreementFinance.tenureMonths < tenureMonths) {
                throw new Error('INCORRECT_TENURE_REFINANCING')
            }
            agreementFinance.isRecent = false
            await agreementFinance.save({ transaction })

            // call for refinance
            const payloadForRefinance = {
                financeType: FINANCE_TYPE.REFINANCE,
                interestRate: 0.05 * tenureMonths,
                tenureMonths,
                totalPrincipal,
                downPaymentAmount: data.downPaymentAmount,
                downPaymentPercent: data.downPaymentPercent,
                currentUser: {
                    ...data.currentUser
                },
                isACHPayment: data.isACHPayment,
                paymentStartDate: data.paymentStartDate,
                timezone: data.timezone
            }
            const refinance = await this._finalizeFinance(payloadForRefinance, transaction)
            await transaction.commit()
            return refinance
        } catch (error) {
            await transaction.rollback()
            throw error
        }
    }

    /**
     *  Returns default new Principal (for refinancing)
     */
    async changedPrincipal (userId) {
        const agreementFinance = await this.getAgreementFinance(true)
        /* const changedAmount = await models.ChangeLog.sum('totalPrice', {
            where: {
                addendumId: this.addendumId,
                agreementId: this.agreementId
            }
        })
        return _.get(agreementFinance, 'remainingBalance', 0) + changedAmount */
        // Calculate Interest of Agreement Finance
        let interest = 0
        if (agreementFinance && agreementFinance.agreementFinanceSchedule.length) {
            agreementFinance.agreementFinanceSchedule.forEach(e => {
                interest += e.schedulePayment ? e.interest : 0
            })
        }
        interest = agreementFinance.interestAmount - 0
        const agreementDetails = await models.Agreement.updateTotalPaidAndDue(this.agreementId, userId)
        return (Number(agreementDetails.due) - interest).toFixed(2)
    }

    /**
     *  special financing
     *  @param {object} data req body data
     *  Returns Agreement finance details of special finance
     */
    async specialFinance (data) {
        let transaction
        try {
            transaction = await models.sequelize.transaction()
            let agreementFinance
            if (data.isUnequal) {
                agreementFinance = await this._unequalSpecialFinance(data, transaction)
            } else {
                agreementFinance = await this._finalizeFinance({
                    ...data,
                    // status: STATUSES.PENDING,
                    isActive: true,
                    financeType: FINANCE_TYPE.SPECIAL_EQUAL,
                    totalPrincipal: data.financedAmount
                }, transaction)
            }
            await this.addApprovalRequest(agreementFinance, transaction)
            const financeDetails = await this.getAgreementFinance(false, transaction)
            const result = {
                ...financeDetails.toJSON()
            }
            result.status = financeDetails.approval ? ApprovalsController.ApprovalStatusStr(financeDetails.approval.status) : 'Approved'
            await transaction.commit()
            return result
        } catch (error) {
            await transaction.rollback()
            throw error
        }
    }

    /**
     *
     * @param {Object} financeDetails
     * @param {number} financeDetails.id
     * @param {number} financeDetails.createdBy
     * @param {number} financeDetails.updatedBy
     * @param {*} transaction
     */
    async addApprovalRequest (financeDetails, transaction) {
        const { queueNames, queues } = require('../../../appQueues')
        const specialFinanceWorker = queues[queueNames.specialFinanceWorker]
        const approvalReqBody = {
            resourceType: 'AgreementFinance',
            resourceId: financeDetails.id,
            status: ApprovalsController.ApprovalStatus['Pending'],
            requestedBy: financeDetails.createdBy,
            createdBy: financeDetails.createdBy,
            updatedBy: financeDetails.createdBy
        }

        const createdApproval = await ApprovalsController.createApproval(approvalReqBody, transaction)
        const data = {
            approvalId: createdApproval.id
        }
        specialFinanceWorker.add('specialFinanceWorker', data)
        return financeDetails
    }

    static async fetchSpecialFinanceApprovalRoles (transaction) {
        const financeRoles = []
        const roles = await models.SpecialFinanceApprovalRoles.scope('withUserRoles').findAll({ transaction })
        roles.forEach(ele => {
            financeRoles[ele.userRole.name] = ele.userRole.id
        })
        return financeRoles
    }

    /**
     *  unequal special financing
     *  @param {object} data req body data for unequal special finance
     *  @param {object} transaction DB transaction
     *  Returns Agreement finance details of special finance
     */
    async _unequalSpecialFinance (data, transaction) {
        const existingAgreementFinance = await this.getAgreementFinance(false, transaction)
        this._checkExistingFinance(existingAgreementFinance)
        const payload = this._createPayloadForAgreementFinance({
            ...data,
            // status: STATUSES.PENDING,
            isActive: true,
            financeType: FINANCE_TYPE.SPECIAL_UNEQUAL,
            remainingBalance: data.financedAmount + _.get(data, 'interestAmount', 0)
        })
        const agreementFinance = await models.AgreementFinance.create(payload, { transaction })
        let expectedBalanceAfterEachPayment = agreementFinance.remainingBalance
        const agreementFinanceSchedulePayload = _.sortBy(data.installments, ['paymentIndex']).map(eachInstallment => {
            expectedBalanceAfterEachPayment -= eachInstallment.expectedPaymentAmount
            return {
                ...eachInstallment,
                agreementFinanceId: agreementFinance.id,
                balance: expectedBalanceAfterEachPayment,
                remainingInterestToBePaid: eachInstallment.interest
            }
        })
        await models.AgreementFinanceSchedule.bulkCreate(agreementFinanceSchedulePayload, { transaction })
        return agreementFinance
    }

    /**
     *  Revoke active finance
     *  Returns revoked finance
     */
    async revokeFinance (userId) {
        let transaction
        try {
            transaction = await models.sequelize.transaction()
            await this.removeFinanceDiscount(userId, transaction)
            let agreementFinance = await this.getAgreementFinance(false, transaction)
            if (!agreementFinance) {
                throw new Error('AGREEMENT_FINANCE_NOT_FOUND')
            }
            agreementFinance.isActive = false
            agreementFinance.isRecent = false
            agreementFinance = await agreementFinance.save({ transaction })
            await models.Agreement.updateAndGetTotal(this.agreementId, userId, transaction)
            const whereConditions = {
                resourceId: agreementFinance.id,
                resourceType: 'AgreementFinance' }
            await ApprovalsController.removeApprovalRequest(whereConditions, userId, transaction)
            await transaction.commit()
            return agreementFinance
        } catch (error) {
            await transaction.rollback()
            throw error
        }
    }

    /**
     * This method return a boolean depending on the count of special finances that exists for an agreement
     * @param {*} transaction
     */
    async agreementSpecialFinanceCheck (transaction) {
        try {
            let agreementSpecialFinanceCountQuery = `
                SELECT COUNT(AgreementFinance.id) AS agreementSpecialFinanceCount
                FROM Agreement
                INNER JOIN AgreementFinance ON  AgreementFinance.agreementId = Agreement.id
                WHERE AgreementFinance.financeType IN ('Special-equal', 'Special-unequal')
                AND Agreement.id =:agreementId
                AND AgreementFinance.isActive = 1
            `
            let agreementSpecialFinanceDetails = await models.sequelize.query(agreementSpecialFinanceCountQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId
                },
                transaction
            })

            return agreementSpecialFinanceDetails.length ? agreementSpecialFinanceDetails[0].agreementSpecialFinanceCount > 0 : null
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method return a boolean depending on whether the special finances have been approved by CEO or CFO for an agreement, whether the special finance have been declined or if it's in pending status yet to be approved
     * @param {*} transaction
     */
    async specialFinancesApprovedByCeoOrCfoCheck (transaction) {
        try {
            let specialFinanceDetailsQuery = `
                SELECT
                CASE
                    WHEN Approval.status = 2 AND UserRole.name IN ('CEO', 'CFO') THEN 1
                    WHEN Approval.status IN (3,4) THEN 1
                    ELSE 0
                END AS approvedSpecialFinanceByCeoOrCfoOrDeclined
                FROM Agreement
                INNER JOIN AgreementFinance ON  AgreementFinance.agreementId = Agreement.id
                INNER JOIN Approval ON Approval.resourceId = AgreementFinance.id
                LEFT JOIN [User] ON [User].id = Approval.approvedOrRejectedBy
                LEFT JOIN UserRole ON UserRole.id = [User].userRoleId
                WHERE AgreementFinance.financeType IN ('Special-equal', 'Special-unequal')
                AND Approval.resourceType = 'AgreementFinance'
                AND AgreementFinance.isActive = 1
                AND Agreement.id =:agreementId
            `
            let specialFinanceDetails = await models.sequelize.query(specialFinanceDetailsQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId
                },
                transaction
            })

            return specialFinanceDetails.length ? specialFinanceDetails[0].approvedSpecialFinanceByCeoOrCfoOrDeclined > 0 : null
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * @returns This function returns the finance discount applied for the agreement based on the discountTitle passed to the function
     * @param {String} discountTitle title of the adjiustment to be fetched
     * @param {*} transaction
     */
    async getFinanceDiscountDetails (discountTitle, transaction) {
        const whereCond = {
            deletedAt: null,
            deletedBy: null
        }
        if (this.agreementId) {
            whereCond.agreementId = this.agreementId
        }
        if (this.addendumId) {
            whereCond.addendumId = this.addendumId
        }
        const AgreementAdjustment = await models.AgreementAdjustment.findOne({
            where: whereCond,
            include: [
                {
                    model: models.Adjustment,
                    where: {
                        title: discountTitle
                    }
                }
            ],
            transaction
        })
        return AgreementAdjustment
    }

    /**
     * @returns This function removes the finance discount applied for the finance type financing
     * @param {Number} userId id of the currently logged in user
     * @param {*} transaction
     */
    async removeFinanceDiscount (userId, transaction) {
        const AgreementController = require('../agreementController/agreementController')

        const agreementController = new AgreementController(this.agreementId)
        // Checking the existence of agreement
        const agreementDetails = await agreementController.getAgreementDetails(transaction)
        const addendumController = new AddendumController(this.agreementId)

        const addendumDetails = await addendumController.getInProgressAddendum(transaction)

        if (!agreementDetails) {
            throw new Error('AGREEMENT_NOT_FOUND')
        }
        if (agreementDetails.status === 'Submitted' && !addendumDetails) {
            throw new Error('AGREEMENT_IS_SUBMITTED')
        }
        const agreementFinanceDetails = await this.getAgreementFinance(false, transaction)
        if (agreementFinanceDetails && agreementFinanceDetails.financeType === FINANCE_TYPE.FINANCE) {
            let financeDiscountDetails = await this.getFinanceDiscountDetails('Finance Discount', transaction)
            if (financeDiscountDetails) {
                financeDiscountDetails.deletedAt = moment().format('YYYY/MM/DD HH:mm:ss')
                financeDiscountDetails.deletedBy = userId
                await financeDiscountDetails.save({ transaction })
            }
            if (agreementFinanceDetails.isACHPayment) {
                let achDiscountDetails = await this.getFinanceDiscountDetails('Automatic Payment Discount', transaction)
                if (achDiscountDetails) {
                    achDiscountDetails.deletedAt = moment().format('YYYY/MM/DD HH:mm:ss')
                    achDiscountDetails.deletedBy = userId
                    await achDiscountDetails.save({ transaction })
                }
            }
            return agreementFinanceDetails
        }
    }

    /**
     * This method returns the total paid in that EMI period
     * @param {*} agmtFinSchedId is the id of AgreementFinanceSchedule
     * @param {*} transaction
     */
    async getTotalPaidForEMI (agmtFinSchedId, transaction) {
        let finSchedPayments = await models.AgreementFinanceSchedulePayment.findAll({
            where: { agreementFinanceScheduleId: agmtFinSchedId },
            include: [
                {
                    model: models.Payment,
                    as: 'payment',
                    attributes: ['amount'],
                    where: { status: 'success' },
                    required: true
                }
            ],
            transaction
        })
        let totalPaidEMI = 0
        if (finSchedPayments.length) {
            finSchedPayments.forEach(e => {
                totalPaidEMI += e.payment.amount
            })
        }
        return totalPaidEMI
    }

    /**
     * This method returns all the finances(excluding revoked) taken till now for particular contract
     * @param {*} agreementId is the id of Agreement
     * @param {*} transaction
     */
    async getAllFinancesExceptRevoked (transaction) {
        let finances = await models.AgreementFinance.scope(['withApproval']).findAll({
            where: { agreementId: this.agreementId, isActive: true },
            attributes: ['addendumId', 'agreementId', 'isActive', 'isRecent', 'financeType', 'remainingBalance', 'remainingInterest', 'interestAmount', 'financedAmount', 'totalAmount', 'tenureMonths', 'downPaymentAmount', 'ppifAmount'],
            include: [{
                model: models.Addendum,
                as: 'addendum',
                attributes: ['addendumNumber']
            }],
            transaction
        })
        if (finances.length) {
            finances = finances.map(fin => {
                fin = fin.toJSON()
                const isApproved = ApprovalsController.ApprovalStatusStr(_.get(fin, 'approval.status')) === 'Approved'
                if (isApproved) {
                    fin.addendumNumber = fin.addendum ? fin.addendum.addendumNumber : null
                    fin.downPaymentAmount = fin.downPaymentAmount - fin.ppifAmount
                    delete fin.addendum
                    return fin
                }
            })
        }
        return _.compact(finances)
    }

    /**
     * This method returns the total interest paid and to be paid from all active finances
     * @param {*} transaction
     */
    async getTotalInterest (finances = [], transaction) {
        finances = finances.length ? finances : await this.getAllFinancesExceptRevoked(transaction)
        let interest = 0
        finances.forEach((fin, index) => {
            const isApproved = ApprovalsController.ApprovalStatusStr(_.get(fin, 'approval.status')) === 'Approved'
            if (isApproved) {
                // interest += fin.remainingBalance === 0 ? (fin.interestAmount - fin.remainingInterest) : fin.interestAmount
                /** interest amount to be added to the cash price, should be the difference of interest amount and remaining interest,
                when the remaining balance of a finance is 0 or greater, until it's the latest finance */
                interest += ((fin.remainingBalance === 0) || ((index + 1) !== finances.length)) ? (fin.interestAmount - fin.remainingInterest) : fin.interestAmount
            }
        })
        return interest
    }

    /**
     * This method returns the present/current Finance Schedule of active and recent financing
     * @param {*} agmntFinId is the AgreementFinance Id
     * @param {*} transaction
     */
    async getPresentFinanceSchedule (agmntFinId, transaction) {
        const currentDate = moment().toISOString()
        let agreementFinanceSchedule = await models.AgreementFinanceSchedule.findAll({
            where: {
                agreementFinanceId: agmntFinId,
                expectedPaymentDate: {
                    [Op.lte]: currentDate
                }
            },
            limit: 1,
            order: [['paymentIndex', 'DESC']],
            transaction
        })
        logger.info('Current Agreement Finance Schedule', agreementFinanceSchedule)
        return agreementFinanceSchedule.length ? agreementFinanceSchedule[0] : null
    }

    /**
     * This method returns the total of payments after financing is taken to calculate
     * @param {*} paymentId is the payment id which has to be excluded from fetching
     * @param {*} agreementId is the agreement id
     * @param {*} date is the agreement finance created date
     * @param {*} transaction
     */
    async getTotalOfPaymentsAfterFinancing (paymentId, agreementId, date, transaction) {
        date = moment(date).toISOString()
        const payments = await models.Payment.findAll({
            where: {
                id: {
                    [Op.ne]: paymentId
                },
                resourceId: agreementId,
                resourceType: 'Agreement',
                createdAt: {
                    [Op.gte]: date
                },
                status: 'success'
            },
            transaction
        })
        let totalPayment = 0
        if (payments.length) {
            payments.forEach(p => {
                totalPayment += p.amount
            })
        }
        return totalPayment
    }

    /**
     * This method fetches the first EMI start date
     * @param {*} agreementFinanceId is the Agreement Finance Id
     * @param {*} transaction
     */
    async getFirstEMIDate (agreementFinanceId, transaction) {
        let agreementFinanceSchedule = await models.AgreementFinanceSchedule.findOne({
            where: {
                agreementFinanceId: agreementFinanceId,
                paymentIndex: 1
            },
            transaction
        })
        return agreementFinanceSchedule.expectedPaymentDate
    }

    /**
     * This method triggers the job for adjusting the remainingInterest of each agreement finance schedule, for the active agreement finances
     */
    static async migrateAgreementFinanceRemainingInterest () {
        const { queueNames, queues } = require('../../../appQueues')
        const agreementFinanceQueue = queues[queueNames.agreementFinanceQueue]
        agreementFinanceQueue.add('agreementFinanceQueue')
        return {
            status: 'Added the job to the queue.'
        }
    }
}

module.exports = FinanceController
