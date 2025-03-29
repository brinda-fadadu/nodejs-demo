const logger = require('../lib/logger')
const Email = require('../lib/Emailer/core')
const models = require('../models')
const _ = require('lodash')
const Sms = require('../lib/SMSNotification/sms')
const ApprovalsController = require('../controllers/refactorControllers/adjustmentController/approvalsController')
const { getPriceWithDecimial } = require('../lib/util')

async function adjustmentApprovalEmailWorker (job, done) {
    logger.info(`Processing Discount Approval Email job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
    try {
        let data = job.data
        data.users.map(e => {
            let text = returnText(e.name, data, (job.data || {}).isQuotationRequest)
            // adding the users who can appove the request to the appoval particpants
            Email.sendMail(e.email, 'Requires Approval', text)
        })
        logger.info(`Done Discount Approval Email job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
        done(null, { data: job.data })
    } catch (e) {
        logger.error(e)
        done(e)
    }
}

async function adjustmentApprovalSMSWorker (job, done) {
    logger.info(`Processing Discount Approval SMS job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
    try {
        let data = job.data
        data.users.map(e => {
            // let text = returnSmsText(e.name, data)
            let text = returnText(e.name, data)
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

function returnText (name, data, isQuotationRequest) {
    return `Hello ${name},\n
Please review the below discount request made.\n
Requestor: ${data.requesterName}
${isQuotationRequest ? 'Quotation Number' : 'Case/Contract'} #: ${data.contractNumber}
Statement Total Amount: $${getPriceWithDecimial(data.totalPrice)}
Discount Type: ${data.requestItem}
Discount Amount: $${getPriceWithDecimial(data.amount)}
% Discount (of Total Amount): ${data.totalDiscount || 0} %
Discount Reason: ${data.reason}\n
Please log on to the OnePortal application and navigate to Approval Request under the Alerts section, to review and approve/decline the approval request.\n- ${isQuotationRequest ? 'Sales App' : 'OnePortal'}`
}

// function returnSmsText (name, data) {
//     if (data.adjustmentTypeId === 2) return `Hello ${name},\n\n Arranger/Staff has sent a request - ${data.smsCode} for approval for Discount Request\n Beneficiary Name - ${data.beneficiary}\n OPI ID - ${data.OPI}\n Location - ${data.location}\n Total Contract Amount - $${Number.parseFloat(data.totalPrice).toFixed(2)}\n Discount Type - ${data.requestItem}\n Discount Amount - ${data.amount}\n Discount Reason - ${data.reason}\n Code - ${data.smsCode}\n\n Reply with “Code <space> Yes/No” to approve/ reject the request.`
//     else if (data.adjustmentTypeId === 3) return `Hello ${name},\n\n Arranger/Staff has sent a request - ${data.smsCode} for approval for Adjustment Request\n Beneficiary Name - ${data.beneficiary}\n OPI ID - ${data.OPI}\n Location - ${data.location}\n Total Contract Amount - $${Number.parseFloat(data.totalPrice).toFixed(2)}\n Adjustment Type - ${data.requestItem}\n Adjustment Amount - ${data.amount}\n % Adjustment - \n Adjustment Reason - ${data.reason}\n Code - ${data.smsCode}\n\n Reply with “Code <space> Yes/No” to approve/ reject the request.`
// }

async function adjustmentAutoApprovalWorker (job, done) {
    try {
        const data = job.data
        const approvalsController = new ApprovalsController(data.approvalId)
        const approvalDetails = await approvalsController._loadApproval()
        if (ApprovalsController.ApprovalStatus['Pending'] === approvalDetails.status) {
            const payload = {
                resourceType: 'AgreementAdjustment',
                status: 'AutoApproved',
                actionNotes: 'Request has been Auto Approved'
            }
            await approvalsController.approveOrRejectRequest(payload)
        }
        done(null, { data })
    } catch (e) {
        logger.error(e)
        done(e)
    }
}

async function adjustmentStatusWebhookWorker (job, done) {
    try {
        logger.info(`Processing Approval Webhook job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
        const data = job.data
        let fromNo = _.get(data, 'from.phoneNumber', false)
        if (fromNo) {
            let user = await models.sequelize.query(`SELECT TOP 1 U.id, U.name, U.userRoleId, UserPermissions.description  FROM [User] AS [U]
            JOIN [UserRole] AS [UserPermissions] ON [U].[userRoleId] = [UserPermissions].[id] 
            WHERE dbo.RemoveSpecialChars(phoneNumber) = dbo.RemoveSpecialChars(${fromNo})`, {
                type: models.sequelize.QueryTypes.SELECT,
                plain: true
            })
            if (!user || user.id === null) {
                let errorMessage = 'Mobile no not linked to any user'
                Sms.sendSms(fromNo, errorMessage)
                done(errorMessage)
            }
            const [code, message] = data.subject.split(' ')
            if (![9, 8].includes(data.subject.length) || code.length !== 5 || (message.toLowerCase() !== 'yes' && message.toLowerCase() !== 'no')) {
                let errorMessage = 'Please replay back with <Code> Yes/No Only'
                Sms.sendSms(fromNo, errorMessage)
                done(errorMessage)
            }
            let approval = await models.sequelize.query(`SELECT TOP 1 ap.id, ap.resourceType, ap.status from Approval ap 
            join AgreementAdjustment aa ON ap.resourceId = aa.id 
            join AdjustmentApproval aap ON aap.adjustmentId  = aa.adjustmentId
            where ap.smsCode = ${code} AND aap.approvalRoleId = ${user.userRoleId} order by ap.createdAt desc`, {
                type: models.sequelize.QueryTypes.SELECT,
                plain: true
            })
            if (!approval || approval.id === null) {
                let errorMessage = `${code} is invalid`
                Sms.sendSms(fromNo, errorMessage)
                done(errorMessage)
            }
            if (approval.status !== 1) {
                let errorMessage = `${code} is already in ${ApprovalsController.ApprovalStatusStr(approval.status)} status`
                Sms.sendSms(fromNo, errorMessage)
                done(errorMessage)
            }
            const approvalsController = new ApprovalsController(approval.id)
            const approvalDetails = await approvalsController._loadApproval()
            const status = message.toLowerCase() === 'yes' ? 'Approved' : 'Declined'
            const appReq = {
                resourceType: approval.resourceType,
                actionNotes: `The request is ${status} via SMS by Approver ${user.name}`,
                currentUser: {
                    id: user.id,
                    UserPermissions: { description: user.description }
                },
                status
            }
            const approvalRes = await approvalsController.approveOrRejectRequest(appReq)
            Sms.sendSms(fromNo, `Request no - ${code} and request type - ${approvalDetails.agreementAdjustment ? approvalDetails.agreementAdjustment.Adjustment.title : 'Special Finance'} has been ${ApprovalsController.ApprovalStatusStr(approvalRes.status)} for OPI. Thank you`)
            logger.info(`Done Approval Webhook job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
            done(null, { approvalRes })
        }
    } catch (e) {
        logger.error(e)
        done(e)
    }
}

module.exports = {
    adjustmentApprovalEmailWorker,
    adjustmentApprovalSMSWorker,
    adjustmentAutoApprovalWorker,
    adjustmentStatusWebhookWorker
}
