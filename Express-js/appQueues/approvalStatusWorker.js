const logger = require('../lib/logger')
const Email = require('../lib/Emailer/core')
const SMS = require('../lib/SMSNotification/sms')

const approvalOrRejectText = (data, isQuotationRequest) => {
    return `Hello ${data.requesterName},\n\nThe approval request for ${data.adjustmentType} on ${data.agreementType} ${data.contractNumber} has been ${data.status}\nby ${data.approvedOrRejectedByUser} (${data.approvedOrRejectedByUserRole}). Please log on to the ${isQuotationRequest ? 'Sales App' : 'OnePortal'} application\nand proceed with next steps.\n\n${data.status === 'Approved' ? 'Approval' : 'Rejection'} Notes:\n\n${data.actionNotes}\n\n- ${isQuotationRequest ? 'Sales App' : 'OnePortal'}`
}

const approvalOrRejectSmsText = (data) => {
    // return `Hello ${data.requesterName},\n\nThe Request no - ${data.smsCode} made for OPI - ${data.OPI} for contract number - ${data.contractNumber} has been ${data.status}`
    return `Hello ${data.requesterName},\n\n OPI - ${data.OPI} for contract number - ${data.contractNumber} has been ${data.status}`
}

function approvalStatusEmailWorker (job, done) {
    logger.info(`Processing  Approval Status Email job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
    try {
        let data = job.data
        let text = ''
        if (data.isAutoApproved) {
            text = autoApprovedText(data, (job.data || {}).isQuotationRequest)
        } else {
            text = approvalOrRejectText(data, (job.data || {}).isQuotationRequest)
        }
        Email.sendMail(data.requesterEmail, `${data.status}: ${data.adjustmentType} on ${data.agreementType} ${data.contractNumber} `, text)

        logger.info(`Done sending mail for the approval request #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
        done(null, { data: job.data })
    } catch (e) {
        logger.error(e)
        done(e)
    }
}
function approvalStatusSMSWorker (job, done) {
    logger.info(`Processing  Approval SMS job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
    try {
        let data = job.data
        let text = ''
        if (data.isAutoApproved) {
            text = autoApprovedText(data)
        } else {
            text = approvalOrRejectSmsText(data)
        }
        SMS.sendSms(data.requesterPhoneNumber, text)

        logger.info(`Done sending sms for the approval request #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
        done(null, { data: job.data })
    } catch (e) {
        logger.error(e)
        done(e)
    }
}

function autoApprovedText (data, isQuotationRequest) {
    return `Hello ${data.requesterName},\n\nThe approval request for ${data.adjustmentType} on ${data.agreementType} ${data.contractNumber} has been auto approved. Please log on to the ${isQuotationRequest ? 'Sales App' : 'OnePortal'} application and proceed with next steps.\n\n- ${isQuotationRequest ? 'Sales App' : 'OnePortal'}`
}

function autoRejectText (data, isQuotationRequest) {
    return `Hello ${data.requestedUserName},\n\nThe approval request for ${data.requestItem} on ${data.agreementType} ${data.contractNumber} has been auto\ndeclined. Please log on to the ${isQuotationRequest ? 'Sales App' : 'OnePortal'} application and proceed with next steps.\n\n- ${isQuotationRequest ? 'Sales App' : 'OnePortal'}`
}

function specialFinanceAutorejectionMail (job, done) {
    logger.info(`Processing  auto reject Status Email job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
    try {
        let data = job.data
        let text = autoRejectText(data, (job.data || {}).isQuotationRequest)
        Email.sendMail(data.requesterUserEmail, `${data.status}: ${data.requestItem} on ${data.agreementType} ${data.contractNumber} `, text)

        logger.info(`Done sending mail for the auto reject request #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
        done(null, { data: job.data })
    } catch (e) {
        logger.error(e)
        done(e)
    }
}

function specialFinanceAutorejectionSms (job, done) {
    logger.info(`Processing  auto reject SMS job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
    try {
        let data = job.data
        let text = autoRejectText(data)
        SMS.sendSms(data.requestedUserPhoneNumber, text)

        logger.info(`Done sending sms for the auto reject request #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
        done(null, { data: job.data })
    } catch (e) {
        logger.error(e)
        done(e)
    }
}

module.exports = {
    approvalStatusEmailWorker,
    approvalStatusSMSWorker,
    specialFinanceAutorejectionMail,
    specialFinanceAutorejectionSms
}
