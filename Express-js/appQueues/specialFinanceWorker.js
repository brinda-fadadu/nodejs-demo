const logger = require('../lib/logger')
const _ = require('lodash')
const Email = require('../lib/Emailer/core')
const Sms = require('../lib/SMSNotification/sms')
const models = require('../models')
const ApprovalsController = require('../controllers/refactorControllers/adjustmentController/approvalsController')
const FinanceController = require('../controllers/refactorControllers/financeController/financeOptionController')
const moment = require('moment')
const Json2csvParser = require('json2csv').Parser
const momentTimeZone = require('moment-timezone')
const fs = require('fs')
const util = require('util')
const writeFileAsync = util.promisify(fs.writeFile)
const unlink = util.promisify(fs.unlink)
const realpath = util.promisify(fs.realpath)
const { getPriceWithDecimial } = require('../lib/util')
const { isTableExist } = require('../controllers/refactorControllers/utils')

async function specialFinanceWorker (job, done) {
    try {
        const data = job.data
        const { queueNames, queues } = require('./index')
        const specialFinanceRequestEmailWorker = queues[queueNames.specialFinanceRequestEmailWorker]
        const specialFinanceRequestSMSWorker = queues[queueNames.specialFinanceRequestSMSWorker]
        const specialFinanceAutorejectionMail = queues[queueNames.specialFinanceAutorejectionMail]
        const specialFinanceAutorejectionSms = queues[queueNames.specialFinanceAutorejectionSms]
        const specialFinanceWorker = queues[queueNames.specialFinanceWorker]
        let quotationNumber

        // fetching the approval request details with pending status
        const approvalDetails = await models.Approval.scope('commonIncludes', 'withOutDeleted').findOne({
            where: {
                id: data.approvalId,
                status: [
                    ApprovalsController.ApprovalStatus['Pending']
                ]
            }
        })
        // if caseinfoForm linked with quote then populating quote number
        if (approvalDetails && (approvalDetails.agreementFinance || {}).agreementId && !ApprovalsController.fetchAgreementOrAddendumDetails(approvalDetails, 'contractNumber')) {
            let isExist = await isTableExist('Quotation')
            if (isExist) {
                let [isQuotationAgreement] = await models.sequelize.query(`
                SELECT 
                   quotationNumber 
                FROM 
                   Quotation 
                WHERE 
                   (cemeteryAgreementId = :agreementId OR funeralAgreementId = :agreementId)
                `, {
                    type: models.sequelize.QueryTypes.SELECT,
                    replacements: {
                        agreementId: (approvalDetails.agreementFinance || {}).agreementId
                    }
                })
                if (isQuotationAgreement && isQuotationAgreement.quotationNumber) {
                    quotationNumber = isQuotationAgreement.quotationNumber
                }
            }
        }
        if (approvalDetails) {
            // if the approval request is in pending state
            const roles = await FinanceController.fetchSpecialFinanceApprovalRoles()

            const dataToSend = {
                contractNumber: ApprovalsController.fetchAgreementOrAddendumDetails(approvalDetails, 'contractNumber') || quotationNumber,
                requestItem: 'Special-Finance',
                agreementType: ApprovalsController.fetchAgreementOrAddendumDetails(approvalDetails, 'type'),
                requestedUserName: approvalDetails.requestedUser.name,
                requestedUserRole: approvalDetails.requestedUser.UserPermissions.description,
                amount: approvalDetails.agreementFinance.totalAmount,
                financedAmount: approvalDetails.agreementFinance.financedAmount,
                tenureMonths: approvalDetails.agreementFinance.tenureMonths,
                paymentsPerYear: approvalDetails.agreementFinance.paymentsPerYear,
                interestAmount: approvalDetails.agreementFinance.interestAmount,
                agreementFinanceSchedule: approvalDetails.agreementFinance.agreementFinanceSchedule,
                financeType: approvalDetails.agreementFinance.financeType,
                totalPrice: _.get(approvalDetails, 'agreementFinance.agreement.totalPrice', 0),
                isQuotationRequest: quotationNumber ? true : false
            }

            const ceoRecord = approvalDetails.approvalRoles.find(element => {
                return element.roleId === roles['CEO']
            })
            const cfoRecord = approvalDetails.approvalRoles.find(element => {
                return element.roleId === roles['CFO']
            })
            if (!ceoRecord || !cfoRecord) {
                // if request is not sent to ceo then adding the executuive role in ApprovalRoles and sending the email and sms
                const reqBody = [
                    {
                        roleId: roles['CEO'],
                        order: 1,
                        requested: 1,
                        approvalId: data.approvalId
                    },
                    {
                        roleId: roles['CFO'],
                        order: 1,
                        requested: 1,
                        approvalId: data.approvalId
                    }
                ]
                await models.ApprovalRoles.bulkCreate(reqBody)

                // fetching the users with ceo roles
                const ceoAndCfoUsers = await models.User.findAll({
                    where: {
                        userRoleId: [roles['CEO'], roles['CFO']]
                    }
                })
                dataToSend.users = ceoAndCfoUsers
                specialFinanceRequestEmailWorker.add('specialFinanceRequestEmailWorker', dataToSend)
                specialFinanceRequestSMSWorker.add('specialFinanceRequestSMSWorker', dataToSend)
                specialFinanceWorker.add('specialFinanceWorker', {
                    approvalId: data.approvalId,
                    shouldAutoDecline: true
                }, {
                    delay: 900 * 1000
                })
            } else if (data.shouldAutoDecline) {
                // the request should be auto declined if none of the ceo and cfo and the vpOfSales takes an action on the request
                await autoDeclineApproval(data.approvalId)
                dataToSend.status = 'Auto Declined'
                dataToSend.requesterUserEmail = approvalDetails.requestedUser.email
                dataToSend.requestedUserPhoneNumber = approvalDetails.requestedUser.phoneNumber
                specialFinanceAutorejectionSms.add('specialFinanceAutorejectionSms', dataToSend)
                specialFinanceAutorejectionMail.add('specialFinanceAutorejectionMail', dataToSend)
            }
        }
        done(null, { data: job.data })
    } catch (error) {
        logger.error(error)
        done(error)
    }
}

async function autoDeclineApproval (approvalId) {
    await models.Approval.update({
        status: ApprovalsController.ApprovalStatus['AutoDeclined'],
        approvedOrRejectedAt: moment().format('YYYY-MM-DD HH:mm:ss')
    }, {
        where: {
            id: approvalId
        }
    })
}
async function specialFinanceRequestEmailWorker (job, done) {
    logger.info(`Processing Discount Approval Email job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
    try {
        let data = job.data
        const json2csvParser = new Json2csvParser({ excelStrings: true })
        let exportRes = []

        if (data.agreementFinanceSchedule.length > 0) {
            exportRes = _.sortBy(data.agreementFinanceSchedule, ['paymentIndex']).map((e, i) => {
                return {
                    'Repayment#': _.get(e, 'paymentIndex', ''),
                    'Repayment Date': _.get(e, 'expectedPaymentDate') ? momentTimeZone(_.get(e, 'expectedPaymentDate')).format('MM/DD/YYYY') : '',
                    'Repayment Amount($)': '$' + _.get(e, 'expectedPaymentAmount', 0),
                    'Principal($)': '$' + _.get(e, 'principal', 0),
                    'Interest($)': '$' + _.get(e, 'interest', 0),
                    'Balance': '$' + _.get(e, 'balance', 0)
                }
            })
            if (data.financeType === 'Special-unequal') exportRes = _.map(exportRes, function (e) { return _.omit(e, 'Principal($)', 'Interest($)') })
        }
        const csv = json2csvParser.parse(exportRes)

        let csvName = './' + Date.now() + '.csv'
        await writeFileAsync(csvName, csv)
        data.csvFile = await realpath(csvName)
        await Promise.all(data.users.map(async e => {
            let text = `Hello ${e.name},\n
            Please review the below special financing request made.\n
            Requestor: ${data.requestedUserName}
            ${data.isQuotationRequest ? 'Quotation Number' : 'Case/Contract'} #: ${data.contractNumber}
            Statement Total Amount: $${getPriceWithDecimial(data.totalPrice)}
            Amount Financing: $${getPriceWithDecimial(data.financedAmount)}
            Reason: Special Financing
            Tenure(${data.isQuotationRequest ? 'In Years' : 'In Months'}): ${data.isQuotationRequest ? (data.tenureMonths / 12) : data.tenureMonths}
            No. of payments per year: ${data.paymentsPerYear}
            Finance Charges: $${getPriceWithDecimial(data.interestAmount)}
            Monthly Payment: ${data.financeType !== 'Special-unequal' ? '$' + getPriceWithDecimial(data.agreementFinanceSchedule[0].expectedPaymentAmount) : 'See schedule'}
            Payment Type: ${data.financeType === 'Special-unequal' ? 'Unequal' : 'Equal'}
            Repayment Schedule: Included attachment\n
            Please log on to the OnePortal application and navigate to Approval Request under the Alerts section, to review and approve/decline the approval request.\n- ${data.isQuotationRequest ? 'Sales App' : 'OnePortal'}`
            // adding the users who can appove the request to the appoval particpants
            await Email.sendMail(e.email, `Approval Request: ${data.requestItem} on ${data.agreementType} ${data.contractNumber}`, text, data.csvFile, 'repaymentScheduleDetails.csv')
        }))
        await unlink(data.csvFile)
        logger.info(`Done Discount Approval Email job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
        done(null, { data: job.data })
    } catch (e) {
        logger.error(e)
        done(e)
    }
}

function specialFinanceRequestSMSWorker (job, done) {
    logger.info(`Processing Discount Approval SMS job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
    try {
        let data = job.data
        data.users.map(e => {
            let text = `Hello ${e.name},\n${data.requestedUserName} (${data.requestedUserRole}) has sent a request for approval of ${data.requestItem} with a\ntotal of $${Number.parseFloat(data.amount).toFixed(2)} on ${data.agreementType} ${data.contractNumber}.Please log on to the OnePortal\napplication and navigate to Approval Request under Alerts section, to review and approve/decline\nthe approval request.\n\n- OnePortal`
            // adding the users who can appove the request to the appoval particpants
            Sms.sendSms(e.phoneNumber, text)
        })
        logger.info(`Done Discount Approval SMS job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
        done(null, { data: job.data })
    } catch (e) {
        logger.error(e)
        done(e)
    }
}

module.exports = {
    specialFinanceRequestEmailWorker,
    specialFinanceRequestSMSWorker,
    specialFinanceWorker
}
