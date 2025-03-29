/**
 * This module provides all the app queues necessary.
 * Here is an example to add job to a queue, queues[DOCUSIGN_QUEUE].add(job)
 * Job processing and job notifications are in the respective queue handler
 */
const config = require('./config')
const Bull = require('bull')
const docusignProcessor = require('./docusignProcessor')
const { adjustmentApprovalEmailWorker, adjustmentApprovalSMSWorker, adjustmentAutoApprovalWorker, adjustmentStatusWebhookWorker } = require('./adjustment_approval_worker')
const { reservationEmailWorker } = require('./reservationWorker')
const { sendCertifierEmail, sendOrganizationEmail } = require('./missingDataEmailWorker')
const { stripePaymentEmailWorker } = require('./stripePaymentEmailWorker')
const pdfProcessor = require('./generatePDFWorker')
const { workOrderEmailWorker, sendWorkOrderTentEmail } = require('./workOrderEmailWorker')
const { cemeteryDaySheetWorker } = require('./cemeteryDaySheetWorker')
const { funeralDaySheetWorker } = require('./funeralDaySheetWorker')
const purchaseOrderProcessor = require('./purchaseOrderEmailWorker')
const scheduleServiceDateUpdateProcessor = require('./scheduleServiceDateUpdateEmailWorker')
const { approvalStatusEmailWorker, approvalStatusSMSWorker, specialFinanceAutorejectionMail, specialFinanceAutorejectionSms } = require('./approvalStatusWorker')
const { specialFinanceWorker, specialFinanceRequestEmailWorker, specialFinanceRequestSMSWorker } = require('./specialFinanceWorker')
const { releasePropertyScheduler, maintenanceTicketScheduler, genealogyTicketScheduler } = require('./scheduler')
const { webCemSyncEventsWorker, webCemSyncDbWorker } = require('../workers/webCem_worker/syncEvents')
const { syncContractToHmis, syncAddendumToHmis, hmisSyncCronJob, hmisToOneportalPaymentCronJOb } = require('./hmisSyncWorker')
const { migrateAllFinanceSchedule } = require('../scripts/data-migration/1-DM-financeSchedule')
const { migrateAgreementFinanceFinanceSchedule } = require('../scripts/data-migration/temp-finance-schedule')
const { migrateAllSchedulePayments } = require('../scripts/data-migration/2-DM-schedulePayments')
const { MaintenanceTicketEmailWorker, GenealogyTicketEmailWorker } = require('./maintenance_ticket_worker')
const { agreementFinanceInterestAdjustmentWorker, duplicateReceiptWorker } = require('./agreementFinanceWorker')
const { syncFuneralAgreementReportWorker } = require('./syncedFuneralAgreementReportWorker')
const { paymentSyncEmailWorker } = require('./paymentSyncEmailWorker')
const { voidPaymentEmailWorker } = require('./voidPaymentEmailWorker')
const { syncAgreementFinanceSchedulePaymentWorker } = require('./syncAgreementFinanceSchedulePaymentWorker')
const { cashReceiptReportWorker } = require('./cashReceiptReportWorker')

// const hmisSyncCronJobSchedule = '0 20 * * *'
// const hmisToOnePortalPaymentsSyncCronJobSchedule = '0 21 * * *'
// const missedPaymentsToOnePortalPaymentsSyncCronJobSchedule = '17 13 * * *'

const { migrateAllOrganizationES } = require('../scripts/data-migration/ES-organization')
const { migrateAllPersonES } = require('../scripts/data-migration/ES-person')
const { migrateAllContractES } = require('../scripts/data-migration/ES-agreement')
const { callAssignedWorker } = require('./callAssignedWorker')
const { funeralOnePageDaySheetWorker } = require('./funeralOnePageDaySheetWorker')
const queueNames = {
    email_queue: `EmailQueue_${process.env.NODE_ENV}`,
    sms_queue: `SMSQueue_${process.env.NODE_ENV}`,
    docusign_queue: `DocusignFormsQueue_${process.env.NODE_ENV}`,
    po_docusign_queue: `PODocusignFormsQueue_${process.env.NODE_ENV}`,
    faa_queue: `FaaQueue_${process.env.NODE_ENV}`,
    adjustment_approval_email_queue: `AdjustmentApprovalEmailQueue_${process.env.NODE_ENV}`,
    reservation_email_queue: `ReservationEmailQueue_${process.env.NODE_ENV}`,
    stripe_payment_email_queue: `StripePaypmetEmailQueue_${process.env.NODE_ENV}`,
    generate_PDF_queue: `generatePDFWorker${process.env.NODE_ENV}`,
    approvalStatusEmailWorker: `ApprovalStatusEmailQueue_${process.env.NODE_ENV}`,
    adjustment_approval_sms_queue: `AdjustmentApprovalSMSQueue_${process.env.NODE_ENV}`,
    approvalStatusSMSWorker: `ApprovalStatusSMSQueue_${process.env.NODE_ENV}`,
    specialFinanceWorker: `SpecialFinanceWorker_${process.env.NODE_ENV}`,
    specialFinanceRequestEmailWorker: `specialFinanceRequestEmailWorker_${process.env.NODE_ENV}`,
    specialFinanceRequestSMSWorker: `specialFinanceRequestSMSWorker_${process.env.NODE_ENV}`,
    cemetery_daysheet_email_queue: `cemeteryDaySheetEmailQueue_${process.env.NODE_ENV}`,
    funeral_daysheet_email_queue: `funeralDaySheetEmailQueue_${process.env.NODE_ENV}`,
    specialFinanceAutorejectionMail: `specialFinanceAutorejectionMail_${process.env.NODE_ENV}`,
    specialFinanceAutorejectionSms: `specialFinanceAutorejectionSms_${process.env.NODE_ENV}`,
    release_non_guaranteed_properties: `releasePropertySchedulerQueue_${process.env.NODE_ENV}`,
    webCemQueue: `webCemQueue_${process.env.NODE_ENV}`,
    webCemPropertySyncQueue: `webCemPropertySyncQueue_${process.env.NODE_ENV}`,
    hmis_sync_queue: `hmisSyncContractQueue_${process.env.NODE_ENV}`,
    sync_cron_job: `syncCronJob_${process.env.NODE_ENV}`,
    dataMigrationFinanceScheduleJob: `data_migration_finance_schedule_${process.env.NODE_ENV}`,
    dataMigrationSchedulePaymentsJob: `data_migration_schedule_payments_${process.env.NODE_ENV}`,
    OrganizationESMigrationScheduleJob: `organization_es_migration_schedule_${process.env.NODE_ENV}`,
    OrganizationESMigrationScheduleJobEveryMonth: `organization_es_migration_schedule_monthly_${process.env.NODE_ENV}`,
    PersonESMigrationScheduleJob: `person_es_migration_schedule_${process.env.NODE_ENV}`,
    PersonESMigrationScheduleJobEveryMonth: `person_es_migration_schedule_monthly_${process.env.NODE_ENV}`,
    adjustmentAutoApprovalWorker: `adjustmentAutoApprovalWorker_${process.env.NODE_ENV}`,
    adjustmentStatusWebhookWorker: `adjustmentStatusWebhookWorker__${process.env.NODE_ENV}`,
    callAssignedWorker: `callAssignedWorker__${process.env.NODE_ENV}`,
    MaintenanceTicketWorkerJob: `maintenance_ticket_queue__${process.env.NODE_ENV}`,
    GenealogyTicketWorkerJob: `genealogy_ticket_queue__${process.env.NODE_ENV}`,
    maintenance_ticket_email_trigger: `maintenance_ticket_email_trigger__${process.env.NODE_ENV}`,
    genealogy_ticket_email_trigger: `genealogy_ticket_email_trigger__${process.env.NODE_ENV}`,
    ContractESMigrationScheduleJob: `contract_es_migration_schedule__${process.env.NODE_ENV}`,
    agreementFinanceQueue: `agreement_finance_remaining_interest_adjustment__${process.env.NODE_ENV}`,
    duplicateReceiptJob: `modify_duplicate_receipt_${process.env.NODE_ENV}`,
    agreementFinanceScheduleMigrationJob: `agreement_finance_schedule_migration__${process.env.NODE_ENV}`,
    hmis_to_oneportal_payments_sync_cron_job: `hmis_to_oneportal_payments_sync_cron_job__${process.env.NODE_ENV}`,
    funeral_one_page_daysheet_email_queue: `funeralOnePageDaySheetEmailQueue__${process.env.NODE_ENV}`,
    deletingDocusignDraftsDailyJob: `DeleteDocusignDraftsQueue__${process.env.NODE_ENV}`,
    syncAgreementFinanceSchedulePaymentJob: `syncAgreementFinanceSchedulePaymentQueue__${process.env.NODE_ENV}`,
    // missedPayments_to_oneportal_payments_sync_cron_job: `missedPayments_to_oneportal_payments_sync_cron_job${process.env.NODE_ENV}`,
    docusign_email_queue: `Docusign_Email_Queue__${process.env.NODE_ENV}`,
    docusign_completed_email_queue: `Docusign_Completed_Email_Queue__${process.env.NODE_ENV}`,
    docusign_automatic_email_queue: `Docusign_Automatic_Email_Queue__${process.env.NODE_ENV}`,
    cashReceiptReportDailyJob: `Cash_Receipt_Report_Daily_Job__${process.env.NODE_ENV}`,
    missingDataOrganizationEmailJob: `MissingDataOrganizationEmailJob_${process.env.NODE_ENV}`,
    missingDataCertifierEmailJob: `missingDataCertifierEmailJob_${process.env.NODE_ENV}`,
    docusign_duplicate_recipients_removal: `docusign_Duplicate_Recipients_Removal_Queue_${process.env.NODE_ENV}`
}

const queues = {}
Object.values(queueNames).forEach(queueName => {
    let newQueue = new Bull(queueName, config.url)
    queues[`${queueName}`] = newQueue
    newQueue.on('error', function (error) {
        console.log('error', error)
    })
})

if (process.env.NODE_ENV !== 'test') {
    queues[queueNames.docusign_queue].process('sendForm', docusignProcessor.newSendForm)
    queues[queueNames.po_docusign_queue].process('POsendForm', docusignProcessor.sendForm)
    queues[queueNames.adjustment_approval_email_queue].process('adjustmentApprovalEmailWorker', adjustmentApprovalEmailWorker)
    queues[queueNames.reservation_email_queue].process('reservationEmailWorker', reservationEmailWorker)
    queues[queueNames.stripe_payment_email_queue].process('stripePaymentEmailWorker', stripePaymentEmailWorker)
    queues[queueNames.generate_PDF_queue].process('generatePDFWorker', pdfProcessor.generatePDFWorker)
    queues[queueNames.email_queue].process('ScheduleServiceDateUpdateEmail', scheduleServiceDateUpdateProcessor.scheduleServiceDateUpdateEmailWorker)
    queues[queueNames.email_queue].process('WorkOrderEmail', workOrderEmailWorker)
    queues[queueNames.email_queue].process('WorkOrderTentEmail', sendWorkOrderTentEmail)
    queues[queueNames.email_queue].process('PurchaseOrderEmail', purchaseOrderProcessor.purchaseOrderEmailWorker)
    queues[queueNames.email_queue].process('SyncedFuneralAgreementReport', syncFuneralAgreementReportWorker)
    queues[queueNames.email_queue].process('PaymentSyncEmail', paymentSyncEmailWorker)
    queues[queueNames.email_queue].process('VoidPaymentEmail', voidPaymentEmailWorker)
    queues[queueNames.approvalStatusEmailWorker].process('approvalStatusEmailWorker', approvalStatusEmailWorker)
    queues[queueNames.approvalStatusSMSWorker].process('approvalStatusSMSWorker', approvalStatusSMSWorker)
    queues[queueNames.adjustment_approval_sms_queue].process('adjustmentApprovalSMSWorker', adjustmentApprovalSMSWorker)
    queues[queueNames.specialFinanceWorker].process('specialFinanceWorker', specialFinanceWorker)
    queues[queueNames.specialFinanceRequestEmailWorker].process('specialFinanceRequestEmailWorker', specialFinanceRequestEmailWorker)
    queues[queueNames.specialFinanceRequestSMSWorker].process('specialFinanceRequestSMSWorker', specialFinanceRequestSMSWorker)
    queues[queueNames.cemetery_daysheet_email_queue].process('cemeteryDaySheetEmailQueue', cemeteryDaySheetWorker)
    queues[queueNames.funeral_daysheet_email_queue].process('funeralDaySheetEmailQueue', funeralDaySheetWorker)
    queues[queueNames.specialFinanceAutorejectionMail].process('specialFinanceAutorejectionMail', specialFinanceAutorejectionMail)
    queues[queueNames.specialFinanceAutorejectionSms].process('specialFinanceAutorejectionSms', specialFinanceAutorejectionSms)
    queues[queueNames.release_non_guaranteed_properties].process(releasePropertyScheduler)
    queues[queueNames.webCemQueue].process('webCemQueue', webCemSyncEventsWorker)
    queues[queueNames.agreementFinanceQueue].process('agreementFinanceQueue', agreementFinanceInterestAdjustmentWorker)
    queues[queueNames.duplicateReceiptJob].process('duplicateReceiptJob', duplicateReceiptWorker)
    queues[queueNames.syncAgreementFinanceSchedulePaymentJob].process('syncAgreementFinanceSchedulePayment', syncAgreementFinanceSchedulePaymentWorker)

    queues[queueNames.hmis_sync_queue].process('SyncContract', syncContractToHmis)
    queues[queueNames.hmis_sync_queue].process('SyncContractAddendum', syncAddendumToHmis)
    queues[queueNames.dataMigrationFinanceScheduleJob].process('dataMigrationFinanceScheduleJob', migrateAllFinanceSchedule)
    queues[queueNames.agreementFinanceScheduleMigrationJob].process('agreementFinanceScheduleMigrationJob', migrateAgreementFinanceFinanceSchedule)
    queues[queueNames.dataMigrationSchedulePaymentsJob].process('dataMigrationSchedulePaymentsJob', migrateAllSchedulePayments)
    queues[queueNames.sync_cron_job].process('sync_cron_job', hmisSyncCronJob)
    queues[queueNames.hmis_to_oneportal_payments_sync_cron_job].process('hmis_to_oneportal_payments_sync_cron_job', hmisToOneportalPaymentCronJOb)
    queues[queueNames.funeral_one_page_daysheet_email_queue].process('funeralOnePageDaySheetEmailQueue', funeralOnePageDaySheetWorker)

    // queues[queueNames.missedPayments_to_oneportal_payments_sync_cron_job].process(insertMissedPaymentsToDB)

    queues[queueNames.OrganizationESMigrationScheduleJob].process('OrganizationESMigrationScheduleJob', migrateAllOrganizationES)
    queues[queueNames.PersonESMigrationScheduleJob].process('PersonESMigrationScheduleJob', migrateAllPersonES)
    queues[queueNames.ContractESMigrationScheduleJob].process('ContractESMigrationScheduleJob', migrateAllContractES)
    // Scheduling the `release non guaranteed properties` for every 5 minutes
    // queues[queueNames.release_non_guaranteed_properties].add({}, { repeat: { cron: '0 0 */1 * * *' } }) // Note : cron already running in one portal sever

    // Scheduling the webCemPropertySyncQueue' for every 30 minutes as of now
    queues[queueNames.webCemPropertySyncQueue].process(webCemSyncDbWorker)
    // queues[queueNames.webCemPropertySyncQueue].add({}, { repeat: { cron: '*/30 * * * *' } }) // Note : cron already running in one portal sever

    // scheduling the `syncNewPayments and itemUsages` to run every day at 8pm
    // queues[queueNames.sync_cron_job].add({}, { repeat: { cron: hmisSyncCronJobSchedule } })
    // queues[queueNames.hmis_to_oneportal_payments_sync_cron_job].add({}, { repeat: { cron: hmisToOnePortalPaymentsSyncCronJobSchedule } })
    // queues[queueNames.missedPayments_to_oneportal_payments_sync_cron_job].add({}, { repeat: { cron: missedPaymentsToOnePortalPaymentsSyncCronJobSchedule } })

    queues[queueNames.adjustmentAutoApprovalWorker].process('adjustmentAutoApprovalWorker', adjustmentAutoApprovalWorker)
    queues[queueNames.adjustmentStatusWebhookWorker].process('adjustmentStatusWebhookWorker', adjustmentStatusWebhookWorker)
    queues[queueNames.callAssignedWorker].process('callAssignedWorker', callAssignedWorker)

    queues[queueNames.MaintenanceTicketWorkerJob].process(MaintenanceTicketEmailWorker)
    queues[queueNames.maintenance_ticket_email_trigger].process(maintenanceTicketScheduler)
    // queues[queueNames.maintenance_ticket_email_trigger].add({}, { repeat: { cron: '0 6 * * *' } }) // Note : cron already running in one portal sever

    queues[queueNames.GenealogyTicketWorkerJob].process(GenealogyTicketEmailWorker)
    queues[queueNames.genealogy_ticket_email_trigger].process(genealogyTicketScheduler)
    // queues[queueNames.genealogy_ticket_email_trigger].add({}, { repeat: { cron: '0 6 * * *' } }) // Note : cron already running in one portal sever

    // Scheduling the saving of Persons to ES on every month 1st at 1 AM
    queues[queueNames.PersonESMigrationScheduleJobEveryMonth].process(migrateAllPersonES)
    // queues[queueNames.PersonESMigrationScheduleJobEveryMonth].add({}, { repeat: { cron: '0 1 1 * *' } }) // Note : cron already running in one portal sever

    // Scheduling the saving of Organizations to ES on every month 1st at 1 AM
    queues[queueNames.OrganizationESMigrationScheduleJobEveryMonth].process(migrateAllOrganizationES)
    // queues[queueNames.OrganizationESMigrationScheduleJobEveryMonth].add({}, { repeat: { cron: '0 2 1 * *' } }) // Note : cron already running in one portal sever

    // Daily job to delete docusign drafts (previewed envelopes)
    // queues[queueNames.deletingDocusignDraftsDailyJob].process(docusignProcessor.deleteDrafts)
    // queues[queueNames.deletingDocusignDraftsDailyJob].add({}, { repeat: { cron: '30 20 * * *' } })

    // After each recipient has signed the docusign document/agreement mail will be triggered
    queues[queueNames.docusign_email_queue].process('docusignEmailWorker', docusignProcessor.docusignEmailWorker)

    // After all recipients has signed the docusign document/agreement acknowledgement mail will be triggered to all recipients
    queues[queueNames.docusign_completed_email_queue].process('docusignCompletedEmailWorker', docusignProcessor.docusignCompletedEmailWorker)

    // Sending mail to the next recipient automatically after 5 mins - Docusign
    queues[queueNames.docusign_automatic_email_queue].process('docusignAutomaticEmailWorker', docusignProcessor.docusignAutomaticEmailWorker)

    // Sending cash receipt report daily at 12:05 AM
    queues[queueNames.cashReceiptReportDailyJob].process(cashReceiptReportWorker)
    // queues[queueNames.cashReceiptReportDailyJob].add({}, { repeat: { cron: '05 0 * * *' } }) // Note : cron already running in one portal sever

    queues[queueNames.missingDataOrganizationEmailJob].process('sendOrgnaizationEmail', sendOrganizationEmail)
    // queues[queueNames.missingDataOrganizationEmailJob].add({}, { repeat: { cron: '0 0 0 * * *' } }) // Note : cron already running in one portal sever
    queues[queueNames.missingDataCertifierEmailJob].process('sendCertifierEmail', sendCertifierEmail)
    // queues[queueNames.missingDataCertifierEmailJob].add({}, { repeat: { cron: '0 0 0 * * *' } }) // Note : cron already running in one portal sever

    // After receiving merged signers from docusign, this removed duplicate recipients from DB
    queues[queueNames.docusign_duplicate_recipients_removal].process('removeDuplicateRecipients', docusignProcessor.removeDuplicateRecipientsFromDb)
}

module.exports = {
    queues,
    queueNames
}
