// DM to be handled here
// 1. remainingBalance, status in the AgreementFinance table
// 2. AgreementFinanceSchedulePayment table

// Steps to migrate the data
// 1. Identify the payments made to financing
// 2. Check the date of payment and check the nearest schedule to that data
// 3. Add a record into AgreementFinanceSchedulePayment table
// process.env.NODE_ENV = 'Migration'

const models = require('../../models/index')
const logger = require('../../lib/logger')
const moment = require('moment')
const { Op } = require('sequelize')
const { calculateRemainingBalance } = require('../../utils/emilCalculation')

async function migrateSingleSchedulePayment ({ paymentId, agreementFinanceId, paymentAmount, paymentMadeDate }) {
    const agreementFinance = await models.AgreementFinance.findOne({
        where: {
            id: agreementFinanceId
        }
    })
    let extraPayment = paymentAmount
    let expectedBalance = agreementFinance.remainingBalance || agreementFinance.financedAmount
    paymentMadeDate = moment(paymentMadeDate || undefined).format()
    let agreementFinanceSchedule = await models.AgreementFinanceSchedule.findAll({
        where: {
            agreementFinanceId: agreementFinance.id,
            expectedPaymentDate: {
                [Op.lte]: paymentMadeDate
            }
        },
        limit: 1,
        order: [['paymentIndex', 'DESC']]
    })
    if (agreementFinanceSchedule.length) {
        agreementFinanceSchedule = agreementFinanceSchedule[0]
        // If payment is made within scheduling period
        // extraPayment will be `paymentAmount - expectedPaymentAmount` (maybe +ve or -ve)
        // expectedBalance will be the balance remaining after the payment has been done for that month
        extraPayment -= agreementFinanceSchedule.expectedPaymentAmount
        if (agreementFinanceSchedule.principal) {
            expectedBalance -= agreementFinanceSchedule.principal
        }
        // creating the record in AgreementFinanceSchedulePayment table
        await models.AgreementFinanceSchedulePayment.create({
            paymentId,
            agreementFinanceScheduleId: agreementFinanceSchedule.id
        })
    }
    const remainingBalance = calculateRemainingBalance(expectedBalance, extraPayment)
    agreementFinance.remainingBalance = remainingBalance.toFixed(2)
    await agreementFinance.save()
}

async function migrateAllSchedulePayments (job, done) {
    try {
        const paymentQuery = `
            Select TOP(1) 
            P.id as paymentId,
            P.amount as paymentAmount,
            P.createdAt as paymentMadeDate,
            CPL.AgreementFinanceId as agreementFinanceId
            from Payment P 
            INNER JOIN CemeteryPaymentLog CPL ON P.id = CPL.PaymentId AND CPL.IsFinanceOption = 1
            INNER JOIN AgreementFinanceSchedule AFS ON CPL.AgreementFinanceId = AFS.agreementFinanceId AND AFS.expectedPaymentDate <= P.createdAt
            LEFT JOIN AgreementFinanceSchedulePayment AFSP ON P.id = AFSP.paymentId
            WHERE AFSP.id is null`

        let payment
        do {
            [payment] = await models.sequelize.query(paymentQuery,
                { type: models.sequelize.QueryTypes.SELECT })
            if (payment && payment.agreementFinanceId) {
                await migrateSingleSchedulePayment(payment)
            }
        } while (payment)
        done(null, { data: 'done' })
    } catch (error) {
        logger.error(error)
        done(error)
    }
}

async function migrateAllSchedulePaymentsHandler (req, res, next) {
    try {
        const { queueNames, queues } = require('../../appQueues')
        const dataMigrationSchedulePaymentsJob = queues[queueNames.dataMigrationSchedulePaymentsJob]
        dataMigrationSchedulePaymentsJob.add('dataMigrationSchedulePaymentsJob')
        res.json({
            success: true
        })
    } catch (error) {
        res.json({
            success: false,
            error
        })
    }
}

module.exports = { migrateAllSchedulePayments, migrateAllSchedulePaymentsHandler }
