const logger = require('../lib/logger')
const models = require('../models')
const HMISSyncController = require('../services/hmis/hmisSyncController')
const _ = require('lodash')
const { upsert } = require('../controllers/refactorControllers/utils')
const AgreementController = require('../controllers/refactorControllers/agreementController/agreementController')
const AgreementPropertyController = require('../controllers/refactorControllers/agreementController/agreementPropertiesController')
const HMISAddendumSyncController = require('../services/hmis/syncAddendums/syncAddendumsController')
const hmisDB = require('../services/hmis/hmisConnection')
const env = process.env.NODE_ENV || 'development'
const config = require('./../config/hmis-config')
const PersonController = require('../controllers/refactorControllers/personController/personController')
// const { date } = require('@hapi/joi')
const moment = require('moment')
const FinanceController = require('../controllers/refactorControllers/financeController/financeOptionController')
const newhmisDB = config[env].database
const hmisDBHost = config[env].host
const { asyncForEach } = require('../lib/util')
const { stripeClient } = require('../services').stripe
const PaymentController = require('../controllers/refactorControllers/paymentController/paymentController')
var rollbar = require('./../lib/rollbar')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

/**
 * This method is used to sync a contract to HMIS
 * @param {*} job Default object from Bull
 * @param {*} done Method to call once the job is successful or failure
 */
async function syncContractToHmis (job, done) {
    let transaction, onePortalTransaction
    logger.info(`Processing job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data.id)}`)
    try {
        const data = job.data
        let agreementId = data.agreementId
        let user = data.user
        const agreementDetails = await models.Agreement.findOne({
            where: {
                id: agreementId
            }
        })
        if (agreementDetails.status !== 'Submitted') {
            await updateHmisDataSync('InProgress', agreementId, undefined, user)

            transaction = await hmisDB.sequelize.transaction()
            onePortalTransaction = await models.sequelize.transaction()

            let sequenceRow = await hmisDB.sequelize.query(`SELECT * FROM Sequence`, { type: hmisDB.sequelize.QueryTypes.SELECT, transaction })
            const sequenceId = sequenceRow[0].Next_ID

            let hmisSyncController = new HMISSyncController(agreementId, sequenceId)
            let syncInfo = await hmisSyncController.syncAgreement(user, transaction, onePortalTransaction)
            // Syncing Item Usage
            await hmisSyncController.syncItemUsage(syncInfo.salesId, agreementId, transaction, onePortalTransaction)
            // Updating the need type of AN Trust Item
            await hmisSyncController.updatingNeedTypeANTrustItems(syncInfo.salesId, agreementId, transaction)
            // Syncing Fund Summary
            await hmisSyncController.syncFundSummary(syncInfo.salesId, agreementId, transaction)
            await hmisDB.sequelize.query(`UPDATE Sequence SET Next_ID = ${hmisSyncController.sequenceId}`, { type: hmisDB.sequelize.QueryTypes.UPDATE, transaction })

            await updateHmisDataSync('Success', agreementId, syncInfo.salesId, user, null, onePortalTransaction)

            await transaction.commit()
            await onePortalTransaction.commit()
        }

        // Webcem Job for Confirmed Properties
        try {
            await propertySaveWebcemJob(agreementId, '', user.id)
            // Generate Cert. of Sepulcher pdf files
            let agreementPropertyController = new AgreementPropertyController(agreementId)
            await agreementPropertyController.generateCertificateOfSepulcherFilesAndUploadToAzure(user.id, null, null, true)
        } catch (error) {
            error.fromError = 'ERROR_AFTER_SYNC_JOB'
            throw error
        }
        done(null)
    } catch (e) {
        const agreementDetails = await models.Agreement.findOne({ where: { id: job.data.agreementId } })
        if (agreementDetails.status !== 'Submitted' && _.get(e, 'fromError', null) !== 'ERROR_AFTER_SYNC_JOB') {
            await updateHmisDataSync('Error', job.data.agreementId, undefined, job.data.user, 'System Error')
            await onePortalTransaction.rollback()
            await transaction.rollback()
        }
        logger.error(e)
        logger.error(`Sync agreement failed for agreement with Id ${job.data.agreementId}`)
        done(e)
    }
}

/**
 * This method is used to sync an addendum to HMIS
 * @param {*} job job has data key with values in it
 * @param {*} job.data expects agreementId and user object
 * @param {*} job.data.agreementId
 * @param {*} job.data.user
 * @param {*} done Method to call once the job is successful or failure
 */
async function syncAddendumToHmis (job, done) {
    let transaction, onePortalTransaction
    logger.info(`Processing job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data.id)}`)
    try {
        const data = job.data
        let agreementId = data.agreementId
        let addendumId = data.addendumId
        let user = data.user
        const addendumDetails = await models.Addendum.findOne({
            where: {
                id: addendumId
            }
        })
        if (addendumDetails.status !== 'Submitted') {
            await updateHmisAddendumDataSync('InProgress', agreementId, addendumId, user)
            transaction = await hmisDB.sequelize.transaction()
            onePortalTransaction = await models.sequelize.transaction()

            let sequenceRow = await hmisDB.sequelize.query(`SELECT * FROM Sequence`, { type: hmisDB.sequelize.QueryTypes.SELECT, transaction })
            const sequenceId = sequenceRow[0].Next_ID

            let addendumController = new HMISAddendumSyncController(addendumId, sequenceId)
            let syncInfo = await addendumController.syncAddendum(user, transaction, onePortalTransaction)
            // Syncing Item Usage
            let hmisSyncController = new HMISSyncController(agreementId, syncInfo.sequenceId)
            await hmisSyncController.syncItemUsage(syncInfo.saleId, agreementId, transaction, onePortalTransaction)
            // Updating the need type of AN Trust Item
            await hmisSyncController.updatingNeedTypeANTrustItems(syncInfo.saleId, agreementId, transaction)
            // Syncing Fund Summary
            await hmisSyncController.syncFundSummary(syncInfo.saleId, agreementId, transaction)

            await hmisDB.sequelize.query(`UPDATE Sequence SET Next_ID = ${hmisSyncController.sequenceId}`, { type: hmisDB.sequelize.QueryTypes.UPDATE, transaction })

            await updateHmisAddendumDataSync('Success', agreementId, addendumId, user, null, onePortalTransaction)

            await transaction.commit()
            await onePortalTransaction.commit()
        }
        // Webcem Job for Confirmed Properties
        try {
            await propertySaveWebcemJob(agreementId, addendumId, user.id)
            // Generate Cert. of Sepulcher pdf files
            let agreementPropertyController = new AgreementPropertyController(agreementId)
            await agreementPropertyController.generateCertificateOfSepulcherFilesAndUploadToAzure(user.id, null, null, true)
            // Updating propertyPaidInFullDate if all conditions are met in addendum level only
            await agreementPropertyController.updatePropertyPaidInFullDate()
        } catch (error) {
            error.fromError = 'ERROR_AFTER_SYNC_JOB'
            throw error
        }
        done(null)
    } catch (e) {
        if (_.get(e, 'fromError', null) !== 'ERROR_AFTER_SYNC_JOB') {
            await updateHmisAddendumDataSync('Error', job.data.agreementId, job.data.addendumId, job.data.user, 'System Error')
            await onePortalTransaction.rollback()
            await transaction.rollback()
        }
        logger.error(e)
        logger.error(`Sync agreement failed for agreement with Id ${job.data.agreementId}`)
        done(e)
    }
}

/**
 * This method is to update HMISDataSync table
 * @param {*} toStatus status to be changed to
 * @param {*} agreementId This is a required field
 * @param {*} salesId Do not send null. Use undefined only
 * @param {*} user
 * @param {string} syncFailureReason
 */
async function updateHmisDataSync (toStatus, agreementId, salesId = undefined, user, syncFailureReason = null, transaction) {
    let onePortalTransaction
    try {
        onePortalTransaction = transaction || await models.sequelize.transaction()
        const hmisDataSync = await models.HMISDataSync.findOne({ where: { agreementId: agreementId }, onePortalTransaction })
        if (!hmisDataSync) throw new Error('Could not find')
        let status = await models.HMISDataSyncStatus.findOne({ where: { name: `${toStatus}` }, onePortalTransaction })
        let hmisData = {
            id: _.get(hmisDataSync, 'id', null),
            statusId: status.id,
            HMISSalesId: salesId
        }
        if (toStatus === 'Error' && syncFailureReason) hmisData['failureReason'] = syncFailureReason
        await upsert('HMISDataSync', hmisData, onePortalTransaction, { userId: user.id })
        const agreementController = new AgreementController(agreementId)
        if (toStatus === 'Success') {
            await agreementController.markAgreementComplete(onePortalTransaction)
        }
        if (!transaction) {
            await onePortalTransaction.commit()
        }
    } catch (e) {
        logger.error(e)
        logger.error(`Updating HMIS data sync table failed for agreement ${agreementId}`)
        if (!transaction) {
            await onePortalTransaction.rollback()
        }
        throw e
    }
}

async function updateHmisAddendumDataSync (toStatus, agreementId, addendumId, user, syncFailureReason = null, transaction) {
    let onePortalTransaction
    try {
        onePortalTransaction = transaction || await models.sequelize.transaction()
        const hmisDataSync = await models.HMISDataSync.findOne({ where: { agreementId: agreementId }, onePortalTransaction })
        const hmisAddendum = await models.HMISAddendumDataSync.findOne({
            where: {
                addendumId
            },
            transaction: onePortalTransaction
        })
        if (!hmisDataSync || !hmisAddendum) throw new Error('Could not find')
        let status = await models.HMISDataSyncStatus.findOne({ where: { name: `${toStatus}` }, onePortalTransaction })

        let hmisAddendumData = {
            id: _.get(hmisAddendum, 'id', null),
            addendumId,
            hmisDataSyncId: _.get(hmisDataSync, 'id', null),
            statusId: status.id
        }

        if (toStatus === 'Error' && syncFailureReason) hmisAddendumData['failureReason'] = syncFailureReason
        if (toStatus === 'Error') {
            await upsert('Addendum', { id: addendumId, isValidated: false, agreementId: agreementId }, onePortalTransaction, { userId: user.id })
        }
        await upsert('HMISAddendumDataSync', hmisAddendumData, onePortalTransaction, { userId: user.id })
        // const addendumController = new AddendumController(agreementId, addendumId)
        if (toStatus === 'Success') {
            // await addendumController.markAddendumComplete(onePortalTransaction)
            // marking all addendum to submitted from cancelled state
            await models.sequelize.query(`update Addendum set status='Submitted' where agreementId=${agreementId}`, { type: hmisDB.sequelize.QueryTypes.UPDATE, onePortalTransaction })
            const agreementController = new AgreementController(agreementId)
            await agreementController.markAgreementComplete(onePortalTransaction)
        }
        if (!transaction) {
            await onePortalTransaction.commit()
        }
    } catch (e) {
        logger.error(e)
        logger.error(`Updating HMISAddendumDataSync table failed for addendum ${addendumId}`)
        if (!transaction) {
            await onePortalTransaction.rollback()
        }
        throw e
    }
}

async function hmisSyncCronJob (job, done) {
    try {
        // Syncing all payments
        rollbar.info(`HmisUpSyncPayment_start`, new Date())
        let syncedPayments = []
        let failedPayments = []
        // get all the agreementid's of payments which have cashReceiptId as null
        // fetch only success /voided payments
        const agreementIds = await models.sequelize.query(`select distinct p.resourceId, p.updatedAt from Payment p
        inner join Agreement ag on ag.id=p.resourceId
        where p.resourceType='Agreement' and ag.type <> 4
         and ((p.status='success' and p.cashReceiptId is null  and CAST(P.createdAt AS DATE) BETWEEN '${job.data.startDate}' AND '${job.data.endDate}')  or 
         (p.status='voided' and p.voidedCashReceiptId is null and  CAST(P.voidedTime AS DATE) BETWEEN '${job.data.startDate}' AND '${job.data.endDate}')) 
         and p.paymentType <> 7 
         order by p.updatedAt desc`, { type: models.sequelize.QueryTypes.SELECT })

        rollbar.info(`HmisUpSyncPaymentLog_agreements_length`, agreementIds.length)
        for await (let record of agreementIds) {
            let transaction, onePortalTransaction
            try {
                transaction = await hmisDB.sequelize.transaction()
                onePortalTransaction = await models.sequelize.transaction()
                const hmisSyncController = new HMISSyncController(record.resourceId)
                let sequenceRow = await hmisDB.sequelize.query(`SELECT * FROM Sequence`, { type: hmisDB.sequelize.QueryTypes.SELECT, transaction })
                hmisSyncController.sequenceId = sequenceRow[0].Next_ID
                const cashReceiptPaymentData = await hmisSyncController.syncAgreementPayments(false, null, transaction, onePortalTransaction, 'sync_job')
                await hmisDB.sequelize.query(`UPDATE Sequence SET Next_ID = ${hmisSyncController.sequenceId}`, { type: hmisDB.sequelize.QueryTypes.UPDATE, transaction })
                await Promise.all(cashReceiptPaymentData.map(async data => {
                    await hmisSyncController.updateCashReceiptId(data, onePortalTransaction)
                }))
                await transaction.commit()
                await onePortalTransaction.commit()
                syncedPayments = [...syncedPayments, ...cashReceiptPaymentData]
            } catch (error) {
                await transaction.rollback()
                await onePortalTransaction.rollback()
                failedPayments = [...failedPayments, error.paymentId]
                rollbar.error(`HmisUpSyncPaymentLog_Error`, record, error.paymentId)
                logger.error(`Something went wrong with Syncing payments for agreement ${record.resourceId}`)
                logger.error(error)
            }
        }
        rollbar.info(`HmisUpSyncPayment_end`, new Date())
        const { queueNames, queues } = require('./index')
        const paymentOrderEmailWorker = queues[queueNames.email_queue]

        paymentOrderEmailWorker.add('PaymentSyncEmail', { syncedPayments, failedPayments })

        // Get all agreements whose item usages are not synced but the respective agreements are synced to HMIS
        const allItemUsageSyncAgreements = await models.sequelize.query(`select DISTINCT
        case
            when ali.agreementId is not null then ali.agreementId 
            when ap.agreementId is not null then ap.agreementId 
            when ami.agreementId is not null then ami.agreementId 
        end as agreementId, Agreement.type as type, Agreement.contractNumber as contractNumber, iu.Sale_Item_ID, HMISDataSync.HMISSalesId as HMISSalesId from ItemUsage iu
        Left  join AgreementLocationItem ali  on ali.id = iu.resourceId and iu.resourceType='AgreementLocationItem'
        Left  join AgreementProperty ap  on ap.id = iu.resourceId and iu.resourceType='AgreementProperty'
        Left  join AgreementMemorialItem ami on ami.id = iu.resourceId and iu.resourceType='AgreementMemorialItem'
        inner join Agreement on Agreement.id =ali.agreementId or Agreement.id = ap.agreementId or Agreement.id =ami.agreementId
        LEFT JOIN HMISDataSync on HMISDataSync.agreementId = Agreement.id
        where iu.Sale_Item_ID is NULL AND HMISSalesId is NOT NULL`, { type: models.sequelize.QueryTypes.SELECT })

        for (let rowInfo of allItemUsageSyncAgreements) {
            let transaction, onePortalTransaction
            try {
                transaction = await hmisDB.sequelize.transaction()
                onePortalTransaction = await models.sequelize.transaction()
                let sequenceRow = await hmisDB.sequelize.query(`SELECT * FROM Sequence`, { type: hmisDB.sequelize.QueryTypes.SELECT, transaction })
                const hmisSyncController = new HMISSyncController(rowInfo.agreementId, sequenceRow[0].Next_ID)
                await hmisSyncController.syncItemUsage(rowInfo.HMISSalesId, rowInfo.agreementId, transaction, onePortalTransaction)
                // Syncing Fund Summary
                await hmisSyncController.syncFundSummary(rowInfo.HMISSalesId, rowInfo.agreementId, transaction)
                await transaction.commit()
                await onePortalTransaction.commit()
            } catch (error) {
                await transaction.rollback()
                await onePortalTransaction.rollback()
                logger.error(`Something went wrong with Syncing itemUsages for agreement ${rowInfo.resourceId}`)
                logger.error(error)
                throw error
            }
        }
        done(null)
    } catch (error) {
        logger.error(error)
        logger.error(`Something went wrong with cron job for HMIS Sync`)
        done(error)
    }
}

async function propertySaveWebcemJob (agreementId, addendumId, userId) {
    let whereCondition = { agreementId, reservationStatus: 'confirmed', deletedAt: null, deletedBy: null, addendumId: null }
    if (addendumId) {
        whereCondition.addendumId = addendumId
    }
    let confirmedProps = await models.AgreementProperty.findAll({
        where: whereCondition
    })
    await Promise.all(
        confirmedProps.map(async e => {
            // Check Item Usage of Property
            let [itemUsage] = await models.ItemUsage.findAll({
                where: { resourceType: 'AgreementProperty', resourceId: e.id, deletedAt: null, deletedBy: null },
                include: [
                    {
                        model: models.ItemUsageStatus,
                        as: 'status',
                        where: { status: 'Used' },
                        required: true
                    }
                ]
            })
            let hmisData
            if (addendumId) {
                hmisData = await models.HMISAddendumDataSync.findOne({
                    where: {
                        addendumId,
                        statusId: 3
                    }
                })
            } else {
                hmisData = await models.HMISDataSync.findOne({
                    where: {
                        agreementId,
                        statusId: 3
                    }
                })
            }
            let obj = {
                agreementId: agreementId,
                addendumId: addendumId,
                purchaseDate: hmisData.updatedAt

            }
            // sending data to webcem
            const { queueNames, queues } = require('../appQueues')
            const webCemQueue = queues[queueNames.webCemQueue]
            const webCemData = {
                event: 'property.save',
                agreementId,
                userId: userId,
                propertyId: e.propertyId,
                status: 'Sold',
                contractObj: obj
            }
            if (itemUsage) {
                webCemData.status = 'Occupied'
            }
            webCemQueue.add('webCemQueue', webCemData)
        })
    )
}

async function hmisToOneportalPaymentCronJOb (job, done) {
    try {
        const query1 = `SELECT DISTINCT CR.Reference_Nbr AS ReferenceNumber, -- HMIS: Cash_Receipt.Reference_Nbr
        CASE
            WHEN ISNULL(SDP.Receipt_Nbr, '') <> ''
                THEN ISNULL(SDP.Receipt_Nbr, '')
            WHEN ISNULL(CR.Cash_Receipt_NBR, '') <> ''
                THEN CR.Cash_Receipt_NBR
            ELSE ''
            END AS ReceiptNumber, --HMIS: Sales_Down_Pymt.Receipt_Nbr or Cash_Receipt.Cash_Receipt_NBR
        SDP.Receipt_Nbr AS Sales_Down_Pymt_Nbr,
        CR.Cash_Receipt_NBR AS Cash_Receipt_NBR,
        A.AgreementID,
        A.hmisSalesId,
        SDP.Sales_Down_Pymt_ID,
        SCA.Sales_Cash_Application_ID,
        S.Sales_Contract_Nbr AS contractNumber,
        cr.cash_receipt_id,
        -- payor.Object_ID AS PayorId,
         --N.NAME_ID AS nameId,
        --subquery to use person with one of its roles:purchaser(4) or payor(5) (order doesnt matter)
        --Map Payor or Purchaser here from AgreementPerson table
        CR.Amt AS Amount, --HMIS: Cash_Receipt.Amt
        (SELECT pt.Payment_Type_Cd AS 'paymentType',
            pt.Descr AS 'paymentDescr' FOR JSON PATH) AS 'otherInfo',
        CASE CR.Payment_Type_Cd
            WHEN 'AFCTS'
                THEN 2
            WHEN 'AMEX'
                THEN 4
            WHEN 'APD'
                THEN 6
            WHEN 'CC'
                THEN 2
            WHEN 'CFT'
                THEN 2
            WHEN 'CHK'
                THEN 2
            WHEN 'CSH'
                THEN 1
            WHEN 'DISCOVER'
                THEN 4
            WHEN 'FORETHOUGH'
                THEN 2
            WHEN 'HOMESTEADE'
                THEN 2
            WHEN 'LBP'
                THEN 2
            WHEN 'MC'
                THEN 4
            WHEN 'MO'
                THEN 3
            WHEN 'NGL'
                THEN 2
            WHEN 'OTH_INS'
                THEN 2
            WHEN 'PAD'
                THEN 6
            WHEN 'SYS'
                THEN 2
            WHEN 'Visa'
                THEN 4
            END AS PaymentType,
        --columns for log input
        -- A.AgreementID,
        -- N.Primary_Suffix AS suffix,
        -- N.Primary_Prefix AS title,
        -- CASE WHEN ISNULL(N.Primary_First_Name,'') = '' THEN N.Primary_Full_Name ELSE ISNULL(N.Primary_First_Name,'') END  AS FirstName,
        -- N.Primary_Middle_Name AS middleName,
        -- N.Primary_Last_Name AS lastName,
        -- N.Phone_1 AS phoneNumber,
        -- N.Phone_2 AS secondaryPhoneNumber,
        -- N.E_Mail_Addr AS email,
        -- N.Primary_Street_Address AS Primary_Street_Address,
        -- N.Primary_City AS Primary_City,
        -- N.Primary_State AS Primary_State,
        -- N.Primary_Zip AS Primary_Zip,
        -- N.Last_Update_Dt AS PersonUpdatedAt,
        -- CASE N.Gender
        --    WHEN 'M'
        --        THEN 1
        --    WHEN 'F'
        --        THEN 2
        --    WHEN 'U'
        --        THEN 3
        --    END AS 'gender', -- Tejo decided to mae it 3 
        -- N.Language_Cd AS languageId,
        -- N.Deceased AS isAlive,
        -- N.SS_Nbr As ssnLastFour,
        'success' as PaymentStatus,
        CR.Cash_Receipt_Dt AS cashCreatedAt
        --  payor.Last_Update_Dt AS payorUpdatedAt --INTO #TempPayments
        -- A.createdAT AS CreatedAt --to have the same datetime in PAYMENT_LOG
    FROM  HmisDataSync A
    INNER JOIN [${hmisDBHost}].[${newhmisDB}].[dbo].Sales S
        ON A.hmisSalesId = S.Sales_ID
    INNER JOIN [${hmisDBHost}].[${newhmisDB}].[dbo].Sales_Cash_Application SCA
        ON A.hmisSalesId = SCA.Sales_ID
    INNER JOIN [${hmisDBHost}].[${newhmisDB}].[dbo].Cash_Receipt CR
        ON SCA.Cash_Receipt_ID = CR.Cash_Receipt_ID AND isnull(CR.Amt, 0) <> 0
    LEFT join Payment p on P.cashReceiptId = CR.Cash_Receipt_ID --OR P.voidedCashReceiptId = CR.Cash_Receipt_ID
    LEFT JOIN (SELECT * FROM Payment WHERE voidedCashReceiptId IS NOT NULL) P1 ON P1.voidedCashReceiptId = CR.Cash_Receipt_ID
    LEFT OUTER JOIN (SELECT DISTINCT Sales_Cash_Application_ID,Sales_ID,Receipt_Nbr, Sales_Down_Pymt_ID FROM  [${hmisDBHost}].[${newhmisDB}].[dbo].Sales_Down_Pymt) SDP
        ON A.hmisSalesId = SDP.Sales_ID 
            AND SCA.Sales_Cash_Application_ID = SDP.Sales_Cash_Application_ID
    INNER JOIN [${hmisDBHost}].[${newhmisDB}].[dbo].Payment_Type PT
        ON PT.Payment_Type_Cd = CR.Payment_Type_Cd
    LEFT JOIN HmisDownSyncPaymentLog HDSPL
        ON HDSPL.cashReceiptId = CR.Cash_Receipt_ID
    --  INNER JOIN [${hmisDBHost}].[${newhmisDB}].dbo.Object_Name payor ON payor.Object_ID = CR.cash_receipt_id
    -- INNER JOIN [${hmisDBHost}].[${newhmisDB}].dbo.Name N ON n.Name_ID = payor.Name_ID
    WHERE P.ID IS NULL AND HDSPL.id IS NULL 
    --AND DATEADD(day, -6, CAST(GETDATE() AS date)) < CAST(CR.Cash_Receipt_Dt as date) AND CAST(GETDATE() AS date) > CAST(CR.Cash_Receipt_Dt as date)
    -- AND payor.Object_Type_Cd = 'Cash Rcpt' AND payor.Name_Type_Cd = 'Purch'`
        logger.info(`HMIS Payment JOB Query started ${new Date()}`)
        rollbar.info(`HmisDownSyncPayment_start`, new Date())
        const listData = await models.sequelize.query(query1, { type: models.sequelize.QueryTypes.SELECT })
        logger.info(`HMIS Payment JOB Query end ${new Date()} `)
        rollbar.info(`HmisDownSyncPaymentLog_records_length`, listData.length)
        if (listData && listData.length) {
            let payloadArr = []
            let arr = listData
            // .slice(0, 5)
            arr.map((ele) => {
                rollbar.info(`HmisDownSyncPaymentLog_records`, ele)
                payloadArr.push({
                    referenceNumber: ele.ReferenceNumber,
                    receiptNumber: ele.ReceiptNumber,
                    agreementId: ele.AgreementID,
                    hmisSalesId: ele.hmisSalesId,
                    salesDownPymtId: ele.Sales_Down_Pymt_ID,
                    salesCashApplicationId: ele.Sales_Cash_Application_ID,
                    contractNumber: ele.contractNumber,
                    cashReceiptId: ele.cash_receipt_id,
                    amount: ele.Amount,
                    otherInfo: ele.otherInfo,
                    paymentType: ele.PaymentType,
                    paymentStatus: ele.PaymentStatus,
                    cashCreatedAt: ele.cashCreatedAt,
                    synced: 0,
                    salesDownPymtNbr: ele.Sales_Down_Pymt_Nbr,
                    CashReceiptNbr: ele.Cash_Receipt_NBR
                })
            })
            await models.HmisDownSyncPaymentLog.bulkCreate(payloadArr)
            await insertDownSyncPayment(done)
            rollbar.info(`HmisDownSyncPayment_end`, new Date())
            done(null, { success: true })
        } else {
            rollbar.info(`HmisDownSyncPayment_end`, new Date())
            done(null, { success: true })
        }
    } catch (error) {
        rollbar.error(`HmisDownSyncPaymentLog_records_error`, error)
        logger.error(error)
        logger.error(`Something went wrong with cron job for HMIS Sync`)
        done(error)
    }
}

async function insertDownSyncPayment (done) {
    try {
        const query1 = `SELECT DISTINCT
    HDSPL.*,
     N.NAME_ID AS nameId,
    N.Primary_Suffix AS suffix,
    N.Primary_Prefix AS title,
    CASE WHEN ISNULL(N.Primary_First_Name,'') = '' THEN N.Primary_Full_Name ELSE ISNULL(N.Primary_First_Name,'') END  AS FirstName,
    N.Primary_Middle_Name AS middleName,
    N.Primary_Last_Name AS lastName,
    N.Phone_1 AS phoneNumber,
    N.Phone_2 AS secondaryPhoneNumber,
    N.E_Mail_Addr AS email,
    N.Primary_Street_Address AS Primary_Street_Address,
    N.Primary_City AS Primary_City,
    N.Primary_State AS Primary_State,
    N.Primary_Zip AS Primary_Zip,
    N.Last_Update_Dt AS PersonUpdatedAt,
    CASE N.Gender
       WHEN 'M'
           THEN 1
       WHEN 'F'
           THEN 2
       WHEN 'U'
           THEN 3
       END AS 'gender', -- Tejo decided to mae it 3 
    N.Language_Cd AS languageId,
    N.Deceased AS isAlive,
    N.SS_Nbr As ssnLastFour,
    payor.Last_Update_Dt AS payorUpdatedAt 
FROM  HmisDownSyncPaymentLog HDSPL
 INNER JOIN [${hmisDBHost}].[${newhmisDB}].dbo.Object_Name payor ON payor.Object_ID = HDSPL.cashReceiptId
INNER JOIN [${hmisDBHost}].[${newhmisDB}].dbo.Name N ON n.Name_ID = payor.Name_ID
WHERE synced = 0 AND payor.Object_Type_Cd = 'Cash Rcpt' AND payor.Name_Type_Cd = 'Purch'`
        logger.info(`HMIS Payment JOB Query started ${new Date()}`)
        const listData = await models.sequelize.query(query1, { type: models.sequelize.QueryTypes.SELECT })
        logger.info(`HMIS Payment JOB Query end ${new Date()} `)
        let arr = listData
        // .slice(0, 2)
        rollbar.info(`Insert_HmisDownSyncPayment_length`, listData.length)
        await asyncForEach(arr, async (ele, i) => {
            let transaction = await models.sequelize.transaction()
            let alreadyInserted = false
            try {
                rollbar.info(`Insert_HmisDownSyncPayment`, ele)
                logger.info(`HMIS Payment JOB ${ele.referenceNumber} at ${new Date()}`)
                let agreementPersons
                let personId
                let isPaymentExist = await models.Payment.findOne({ where: { [Op.or]: [
                    {
                        cashReceiptId: ele.cashReceiptId
                    },
                    {
                        voidedCashReceiptId: ele.cashReceiptId
                    }
                ] } })
                if (isPaymentExist) {
                    await models.HmisDownSyncPaymentLog.update({
                        synced: 1
                    }, {
                        where: {
                            id: ele.id
                        },
                        transaction
                    })
                    alreadyInserted = true
                    throw new Error('already inserted')
                }
                let oldPerson = await models.sequelize.query(`Select top 1 * from PersonAgreementHMISLog where OldPersonId = ${ele.nameId} `, { type: models.sequelize.QueryTypes.SELECT })
                if (oldPerson.length) {
                    personId = oldPerson[0].PersonId
                } else {
                    let place
                    if (ele.Primary_Street_Address || ele.Primary_State || ele.Primary_City || ele.Primary_Zip) {
                        let addressObj = {
                            line1: ele.Primary_Street_Address,
                            line2: null,
                            state: ele.Primary_State,
                            city: ele.Primary_City,
                            county: null,
                            country: null,
                            zipcode: ele.Primary_Zip
                        }
                        let address = await models.Address.create(addressObj, { transaction })
                        let placeObj = {
                            addressId: address.id,
                            createdBy: 1,
                            updatedBy: 1,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                        place = await models.Place.create(placeObj, { transaction })
                    }
                    // let personUpdatedAt = ele.PersonUpdatedAt && ele.PersonUpdatedAt.split(' ')[0] ? moment(ele.PersonUpdatedAt.split(' ')[0], 'YYYYMMDD HHMMSSSS') : new Date()
                    let personObject = {
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        suffix: ele.suffix,
                        title: ele.title,
                        firstName: ele.FirstName,
                        middleName: ele.middleName,
                        lastName: ele.lastName,
                        phoneNumber: ele.phoneNumber ? ele.phoneNumber.trim() : ele.phoneNumber,
                        secondaryPhoneNumber: ele.secondaryPhoneNumber,
                        email: ele.email,
                        hmisNameId: ele.nameId,
                        gender: ele.gender,
                        // languageId: ele.languageId,
                        isVerified: 1,
                        isAlive: ele.isAlive || null,
                        dateOfBirth: ele.DateOfBirth,
                        createdBy: 1,
                        updatedBy: 1,
                        addressPlaceId: place ? place.id : null
                    }
                    let person = await models.Person.create(personObject, { transaction })

                    let personVerficationDetialsObject = {
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        personId: person ? person.id : null,
                        ssnLastFour: ele.ssnLastFour,
                        onePortalId: PersonController.generateOnePortalId(),
                        createdBy: 1,
                        updatedBy: 1
                    }
                    await models.PersonVerificationDetails.create(personVerficationDetialsObject, { transaction })

                    personId = person.id
                }
                let agreementPersonData = await models.AgreementPerson.findOne({
                    where: {
                        agreementId: ele.agreementId,
                        personId: personId,
                        roleId: 4
                    },
                    transaction
                })
                let payorAgreementPersonId
                if (!agreementPersonData) {
                    // let payorUpdatedAt = ele.payorUpdatedAt && ele.payorUpdatedAt.split(' ')[0] ? moment(ele.payorUpdatedAt.split(' ')[0], 'YYYYMMDD HHMMSSSS') : new Date()
                    let agreementPersonsObject = {
                        agreementId: ele.agreementId,
                        personId: personId,
                        roleId: 4,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        createdBy: 1,
                        updatedBy: 1
                    }
                    agreementPersons = await models.AgreementPerson.create(agreementPersonsObject, { transaction })
                    payorAgreementPersonId = agreementPersons.id
                } else {
                    payorAgreementPersonId = agreementPersonData.id
                }
                let agreement = await models.Agreement.findOne({
                    where: {
                        id: ele.agreementId
                    },
                    transaction
                })
                // let cashCreatedAt = ele.cashCreatedAt && ele.cashCreatedAt.split(' ')[0] ? moment(ele.cashCreatedAt.split(' ')[0], 'YYYYMMDD HHMMSSSS') : new Date()
                let paymentObject = {
                    referenceNumber: ele.referenceNumber,
                    receiptNumber: ele.receiptNumber,
                    resourceType: 'Agreement',
                    paymentType: ele.paymentType,
                    status: ele.PaymentStatus,
                    resourceId: ele.agreementId,
                    payorId: payorAgreementPersonId,
                    amount: ele.amount,
                    otherInfo: ele.otherInfo,
                    cashReceiptId: ele.cashReceiptId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    createdBy: 1,
                    updatedBy: 1,
                    remarks: 'HMIS downsync job'
                }
                const payment = await models.Payment.create(paymentObject, { transaction })

                if (payment) {
                    let agreementFinance = await models.AgreementFinance.findOne({
                        where: {
                            agreementId: ele.agreementId
                        },
                        transaction
                    })
                    logger.info(`HMIS Payment JOB finance sec started ${new Date()}`)
                    if (agreementFinance) {
                        const financeController = new FinanceController(ele.agreementId)
                        await financeController.addPaymentToSchedule(payment, payment.amount, transaction)
                        logger.info(`HMIS Payment JOB finance sec ended ${new Date()}`)
                    }
                    logger.info(`HMIS Payment JOB update total process started ${new Date()}`)
                    await models.Agreement.updateTotalPaidAndDue(ele.AgreementID, 1, transaction)
                    logger.info(`HMIS Payment JOB update total process ended ${new Date()}`)

                    let cemeteryPaymentLogObject = {
                        PaymentId: payment.id,
                        AgreementID: ele.agreementId,
                        PayorId: payorAgreementPersonId,
                        HMISSalesId: ele.hmisSalesId,
                        HMISCashReceiptReferenceNbr: ele.referenceNumber,
                        HMISCashReceiptCashReceiptNBR: ele.CashReceiptNbr,
                        HMISSalesDownPymtReceiptNbr: ele.salesDownPymtNbr,
                        HMISSalesCashReceiptID: ele.cashReceiptId,
                        HMISSalesCashApplicationID: ele.salesCashApplicationId,
                        HMISSalesDownPymtSalesDownPymtId: ele.salesDownPymtI,
                        HMISCashReceiptAmt: ele.amount,
                        IsJob: 1,
                        createdAt: moment().format('YYYY-MM-DD HH:mm:ss'),
                        updatedAt: moment().format('YYYY-MM-DD HH:mm:ss'),
                        IsFinanceOption: agreementFinance ? 1 : 0
                    }
                    const logTable = agreement.type === 1 ? 'FuneralPaymentLog' : 'CemeteryPaymentLog'
                    await insertToPaymentLog(cemeteryPaymentLogObject, logTable, transaction)

                    await models.HmisDownSyncPaymentLog.update({
                        synced: 1
                    }, {
                        where: {
                            id: ele.id
                        },
                        transaction
                    })
                }
                logger.info(`HMIS Payment JOB before commit ${new Date()}`)
                await transaction.commit()
                logger.info(`HMIS Payment JOB after commit ${new Date()}`)
            } catch (err) {
                rollbar.error(`Insert_HmisDownSyncPayment_error`, err, ele)
                if (!alreadyInserted) {
                    await transaction.rollback()
                } else {
                    await transaction.commit()
                }
                logger.error(err)
                logger.error(`Something went wrong with cron job for HMIS Sync`)
                // done(err)
            }
        })
    } catch (err) {
        throw err
    }
}

async function insertToPaymentLog (obj, tableName, transaction) {
    try {
        const keys = Object.keys(obj).join()
        const values = Object.values(obj)
        let query = ` INSERT INTO ${tableName} (
            ${keys}
            ) VALUES(
               :values
            )`
        await models.sequelize.query(query, { type: models.Sequelize.QueryTypes.INSERT,
            transaction,
            replacements: {
                values: values
            } })
        return true
    } catch (error) {
        throw error
    }
}
async function updatePaymentLog (payload, tableName, transaction) {
    try {
        let query = `update ${tableName} set voidedCashReceiptId=${_.get(payload, 'voidedCashReceiptId', null)},
        HMISVoidSalesCashApplicationID=${_.get(payload, 'voidedSalesCashApplicationId', null)} 
         where HMISSalesCashReceiptID=${_.get(payload, 'cashReceiptId', null)}`
        await models.sequelize.query(query, { type: models.Sequelize.QueryTypes.UPDATE,
            transaction })
        return true
    } catch (error) {
        throw error
    }
}

// below method is for single run script in production for missed payments in prod. schedular job related to below method is commented in index file
// FYI: DONOT USE
async function insertMissedPaymentsToDB (job, done) {
    try {
        /* const prodPaymentArray = [{
            'id': 'ch_1IyYdlId3XBXXz6YYvzU2oIU',
            'Description': 'Payment for agreement 2021PNF01228',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-04 08: 44',
            'Amount': 1200,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 1200,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNF01228',
            'CustomerID': 'cus_JU6m4MV1R64y2V',
            'Customer Description': '',
            'Customer Email': 'yawa0316@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyNRiId3XBXXz6YMmpGt47F',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70649,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289418,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNF01228',
            'currentUserId': 95,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyYdRId3XBXXz6YW73jWtAk',
            'Description': 'Payment for agreement 2021PNF01228',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-04 08: 44',
            'Amount': 1200,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 1200,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNF01228',
            'CustomerID': 'cus_JU6m4MV1R64y2V',
            'Customer Description': '',
            'Customer Email': 'yawa0316@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyNRiId3XBXXz6YMmpGt47F',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70649,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289418,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNF01228',
            'currentUserId': 95,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyXnhId3XBXXz6YZByd3bKU',
            'Description': 'Payment for agreement 2021PNF01227',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-04 07: 50',
            'Amount': 1200,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 1200,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNF01227',
            'CustomerID': 'cus_JU6m4MV1R64y2V',
            'Customer Description': '',
            'Customer Email': 'yawa0316@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyNRiId3XBXXz6YMmpGt47F',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70648,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289363,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNF01227',
            'currentUserId': 95,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyXiMId3XBXXz6Y7AdR0ZcL',
            'Description': 'Payment for agreement 2021PNF01227',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-04 07: 45',
            'Amount': 1200,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 1200,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNF01227',
            'CustomerID': 'cus_JU6m4MV1R64y2V',
            'Customer Description': '',
            'Customer Email': 'yawa0316@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyNRiId3XBXXz6YMmpGt47F',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70648,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289363,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNF01227',
            'currentUserId': 95,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyXGiId3XBXXz6YGLczcfnB',
            'Description': 'Payment for agreement 2021PNF01227',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-04 07: 16',
            'Amount': 1200,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 1200,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNF01227',
            'CustomerID': 'cus_JU6m4MV1R64y2V',
            'Customer Description': '',
            'Customer Email': 'yawa0316@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyNRiId3XBXXz6YMmpGt47F',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70648,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289363,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNF01227',
            'currentUserId': 95,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyXEHId3XBXXz6YCdYNRheg',
            'Description': 'Payment for agreement 2021PNF01227',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-04 07: 14',
            'Amount': 1200,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 1200,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNF01227',
            'CustomerID': 'cus_JU6m4MV1R64y2V',
            'Customer Description': '',
            'Customer Email': 'yawa0316@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyNRiId3XBXXz6YMmpGt47F',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70648,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289363,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNF01227',
            'currentUserId': 95,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyWIqId3XBXXz6Ybw8447Ke',
            'Description': 'Payment for agreement 2021PNC01191',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-04 06: 14',
            'Amount': 7600,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 7600,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNC01191',
            'CustomerID': 'cus_JbjmiaDu8gNzst',
            'Customer Description': '',
            'Customer Email': 'kenlouie94108@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyWIiId3XBXXz6YPx31L0HI',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70491,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 288042,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNC01191',
            'currentUserId': 23,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyVpxId3XBXXz6YQJ7AR3xw',
            'Description': 'Payment for agreement 2021PNC01188',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-04 05: 44',
            'Amount': 7600,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 7600,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNC01188',
            'CustomerID': 'cus_JbiXx9m63kCv58',
            'Customer Description': '',
            'Customer Email': 'al88louie@yahoo.com',
            'Captured': true,
            'CardID': 'card_1IyV6fId3XBXXz6YMBKksbfE',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70492,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 288039,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNC01188',
            'currentUserId': 23,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyV6uId3XBXXz6Yl20LXN1t',
            'Description': 'Payment for agreement 2021PNC01192',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-04 04: 58',
            'Amount': 3300,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 3300,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNC01192',
            'CustomerID': 'cus_JbiXx9m63kCv58',
            'Customer Description': '',
            'Customer Email': 'al88louie@yahoo.com',
            'Captured': true,
            'CardID': 'card_1IyV6fId3XBXXz6YMBKksbfE',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70488,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289349,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNC01192',
            'currentUserId': 23,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyUXRId3XBXXz6Y91NcyPRc',
            'Description': 'Payment for agreement 2021CFS00871',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-04 04: 21',
            'Amount': 3168.25,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 3168.25,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021CFS00871',
            'CustomerID': 'cus_JX5jCtWemV1slB',
            'Customer Description': '',
            'Customer Email': '',
            'Captured': true,
            'CardID': 'card_1IyUX2Id3XBXXz6YXjOLcQCN',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70599,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289344,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021CFS00871',
            'currentUserId': 97,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyRVWId3XBXXz6YBv2aYb2g',
            'Description': 'Payment for Invoice',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-04 01: 07',
            'Amount': 2000,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 2000,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNF00358',
            'CustomerID': 'cus_JFrArEMqtViD41',
            'Customer Description': '',
            'Customer Email': 'ftam003@yahoo.com.hk',
            'Captured': true,
            'CardID': 'src_1IyRVUId3XBXXz6YIYiiV1Pq',
            'Invoice ID': 'in_1IyQMOId3XBXXz6YMIHFGbBW',
            'Transfer': '',
            'resourceId': 67575,
            'type': 'email_link_payment',
            'partnerId': '',
            'payorId': 278309,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNF00358',
            'currentUserId': 23,
            'paymentType': 6
        },
        {
            'id': 'ch_1IyR3ZId3XBXXz6Ym4B6QGYj',
            'Description': 'Payment for agreement 2021PNC01259',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-04 00: 38',
            'Amount': 5700,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 5700,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNC01259',
            'CustomerID': 'cus_JbdTY4FcDuF30Q',
            'Customer Description': '',
            'Customer Email': 'zhongfang726@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyQsxId3XBXXz6YCPqRAlRJ',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70773,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289333,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNC01259',
            'currentUserId': 34,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyR2uId3XBXXz6Ye5osdIqx',
            'Description': 'Payment for agreement 2021PNC01259',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-04 00: 37',
            'Amount': 4800,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 4800,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNC01259',
            'CustomerID': 'cus_JbdTY4FcDuF30Q',
            'Customer Description': '',
            'Customer Email': 'zhongfang726@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyQQgId3XBXXz6YlBuIink5',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70773,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289333,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNC01259',
            'currentUserId': 34,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyQqKId3XBXXz6YoDWgjrym',
            'Description': 'Payment for agreement 2021PNC01259',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-04 00: 24',
            'Amount': 2480.71,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 2480.71,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNC01259',
            'CustomerID': 'cus_JbdTY4FcDuF30Q',
            'Customer Description': '',
            'Customer Email': 'zhongfang726@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyQQgId3XBXXz6YlBuIink5',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70773,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289333,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNC01259',
            'currentUserId': 34,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyQexId3XBXXz6Y99tLsArV',
            'Description': 'Payment for agreement 2021CFS00868',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-04 00: 13',
            'Amount': 6263.48,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 6263.48,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021CFS00868',
            'CustomerID': 'cus_Jbdw5IgkdVy3pC',
            'Customer Description': '',
            'Customer Email': 'epberna@yahoo.com',
            'Captured': true,
            'CardID': 'card_1IyQelId3XBXXz6YAh4XO4bq',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70579,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289339,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021CFS00868',
            'currentUserId': 76,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyQSSId3XBXXz6Ykl4EwnYY',
            'Description': 'Payment for agreement 2021PNF01257',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-04 00: 00',
            'Amount': 3219.29,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 3219.29,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNF01257',
            'CustomerID': 'cus_JbdTY4FcDuF30Q',
            'Customer Description': '',
            'Customer Email': 'zhongfang726@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyQQgId3XBXXz6YlBuIink5',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70770,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289326,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNF01257',
            'currentUserId': 34,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyQNpId3XBXXz6YEroNMqaQ',
            'Description': 'Payment for agreement 2021PNF01257',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 23: 55',
            'Amount': 2000,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 2000,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNF01257',
            'CustomerID': 'cus_JbdTY4FcDuF30Q',
            'Customer Description': '',
            'Customer Email': 'zhongfang726@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyQNbId3XBXXz6YrdaQWrhF',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70770,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289326,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNF01257',
            'currentUserId': 34,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyQJ5Id3XBXXz6YTWyhxLlY',
            'Description': 'Payment for agreement 2021PNF01257',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 23: 50',
            'Amount': 2800,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 2800,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNF01257',
            'CustomerID': 'cus_JbdTY4FcDuF30Q',
            'Customer Description': '',
            'Customer Email': 'zhongfang726@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyQHyId3XBXXz6YA04Cs734',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70770,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289326,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNF01257',
            'currentUserId': 34,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyQCLId3XBXXz6YsEfgMp0S',
            'Description': 'Payment for agreement 2021PNF01257',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 23: 43',
            'Amount': 1200,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 1200,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNF01257',
            'CustomerID': 'cus_JbdTY4FcDuF30Q',
            'Customer Description': '',
            'Customer Email': 'zhongfang726@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyQCFId3XBXXz6YcuPXVuaF',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70770,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289326,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNF01257',
            'currentUserId': 34,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyPXpId3XBXXz6YqzG3V1Pt',
            'Description': 'Payment for agreement AA123117',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 23: 01',
            'Amount': 695,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 695,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt AA123117',
            'CustomerID': 'cus_Jbcn602r5hMw5g',
            'Customer Description': '',
            'Customer Email': 'evaitafa19@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyPXiId3XBXXz6Y49KnDkY7',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 46994,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 156815,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': 'AA123117',
            'currentUserId': 125,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyP3sId3XBXXz6YlUdDj0U7',
            'Description': 'Payment for agreement 2021SSO00134',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 22: 30',
            'Amount': 5401.03,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 5401.03,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021SSO00134',
            'CustomerID': 'cus_JbcISn5fYli7po',
            'Customer Description': '',
            'Customer Email': 'karenprosser@yahoo.com',
            'Captured': true,
            'CardID': 'card_1IyP3hId3XBXXz6YWqgnymoa',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70511,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289323,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021SSO00134',
            'currentUserId': 53,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyOpjId3XBXXz6Y6zEkpcRN',
            'Description': 'Payment for agreement 2021CFS00865',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 22: 16',
            'Amount': 54,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 54,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021CFS00865',
            'CustomerID': 'cus_Jbc3Gri82jjGk5',
            'Customer Description': '',
            'Customer Email': 'Jiaaminhuang1987@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyOpXId3XBXXz6Yl3k95ePs',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70565,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289322,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021CFS00865',
            'currentUserId': 157,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyNcsId3XBXXz6YqDoIuyYW',
            'Description': 'Payment for agreement 2021SSO00056',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 20: 58',
            'Amount': 115,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 115,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021SSO00056',
            'CustomerID': 'cus_JbaoxooPPSdyJj',
            'Customer Description': '',
            'Customer Email': '',
            'Captured': true,
            'CardID': 'card_1IyNckId3XBXXz6Y6hWEXuj7',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 62663,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 243371,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021SSO00056',
            'currentUserId': 51,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyNRtId3XBXXz6YfFf7VVq2',
            'Description': 'Payment for agreement 2021PNC00860',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 20: 47',
            'Amount': 4700,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 4700,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNC00860',
            'CustomerID': 'cus_JU6m4MV1R64y2V',
            'Customer Description': '',
            'Customer Email': 'yawa0316@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyNRiId3XBXXz6YMmpGt47F',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 68453,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 285135,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNC00860',
            'currentUserId': 95,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyNPcId3XBXXz6YxCzjfVwy',
            'Description': 'Payment for agreement WSC-2021202',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 20:45',
            'Amount': 635,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 635,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt WSC-2021202',
            'CustomerID': 'cus_J3TljBELBQuvH2',
            'Customer Description': '',
            'Customer Email': 'jley@gmail.com',
            'Captured': true,
            'CardID': 'card_1IRMnbId3XBXXz6YnqD8l1ph',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70763,
            'type': 'card_payment',
            'partnerId': 1,
            'payorId': '',
            'timeZone': 'America/Los_Angeles',
            'contractNumber': 'WSC-2021202',
            'currentUserId': 35,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyNMsId3XBXXz6YJ04wIJxt',
            'Description': 'Payment for agreement WSC-2021201',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 20:42',
            'Amount': 238.5,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 238.5,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt WSC-2021201',
            'CustomerID': 'cus_J3TerldLwNbkMT',
            'Customer Description': '',
            'Customer Email': 'jley@gmail.com',
            'Captured': true,
            'CardID': 'card_1IRMhSId3XBXXz6Y9FbTfM03',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70758,
            'type': 'card_payment',
            'partnerId': 2,
            'payorId': '',
            'timeZone': 'America/Los_Angeles',
            'contractNumber': 'WSC-2021201',
            'currentUserId': 35,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyNMAId3XBXXz6YjOjLEPss',
            'Description': 'Payment for agreement WSC-2021202',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 20:41',
            'Amount': 635,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 635,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt WSC-2021202',
            'CustomerID': 'cus_J3TljBELBQuvH2',
            'Customer Description': '',
            'Customer Email': 'jley@gmail.com',
            'Captured': true,
            'CardID': 'card_1IRMnbId3XBXXz6YnqD8l1ph',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70763,
            'type': 'card_payment',
            'partnerId': 1,
            'payorId': '',
            'timeZone': 'America/Los_Angeles',
            'contractNumber': 'WSC-2021202',
            'currentUserId': 35,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyNKNId3XBXXz6YmhbWVaAf',
            'Description': 'Payment for agreement WSC-2021202',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 20:39',
            'Amount': 635,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 635,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt WSC-2021202',
            'CustomerID': 'cus_J3TljBELBQuvH2',
            'Customer Description': '',
            'Customer Email': 'jley@gmail.com',
            'Captured': true,
            'CardID': 'card_1IRMnbId3XBXXz6YnqD8l1ph',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70763,
            'type': 'card_payment',
            'partnerId': 1,
            'payorId': '',
            'timeZone': 'America/Los_Angeles',
            'contractNumber': 'WSC-2021202',
            'currentUserId': 35,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyMzGId3XBXXz6Y37UuYn7J',
            'Description': 'Payment for agreement 2021ANC00745',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 20:17',
            'Amount': 8455.45,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 8455.45,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021ANC00745',
            'CustomerID': 'cus_JSAj5SzP1uvLbj',
            'Customer Description': '',
            'Customer Email': '',
            'Captured': true,
            'CardID': 'card_1IpGNxId3XBXXz6YBUBeucrA',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 69608,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 288335,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021ANC00745',
            'currentUserId': 25,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyMm5Id3XBXXz6YpHIjnyXQ',
            'Description': 'Payment for agreement WSC-2021201',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 20:04',
            'Amount': 238.5,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 238.5,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt WSC-2021201',
            'CustomerID': 'cus_J3TerldLwNbkMT',
            'Customer Description': '',
            'Customer Email': 'jley@gmail.com',
            'Captured': true,
            'CardID': 'card_1IRMhSId3XBXXz6Y9FbTfM03',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70758,
            'type': 'card_payment',
            'partnerId': 2,
            'payorId': '',
            'timeZone': 'America/Los_Angeles',
            'contractNumber': 'WSC-2021201',
            'currentUserId': 35,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyMliId3XBXXz6YiUpFWnrf',
            'Description': 'Payment for agreement WSC-2021202',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 20:03',
            'Amount': 635,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 635,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt WSC-2021202',
            'CustomerID': 'cus_J3TljBELBQuvH2',
            'Customer Description': '',
            'Customer Email': 'jley@gmail.com',
            'Captured': true,
            'CardID': 'card_1IRMnbId3XBXXz6YnqD8l1ph',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70763,
            'type': 'card_payment',
            'partnerId': 1,
            'payorId': '',
            'timeZone': 'America/Los_Angeles',
            'contractNumber': 'WSC-2021202',
            'currentUserId': 35,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyMjNId3XBXXz6YWVCiySyX',
            'Description': 'Payment for agreement WSC-2021202',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 20:01',
            'Amount': 635,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 635,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt WSC-2021202',
            'CustomerID': 'cus_J3TljBELBQuvH2',
            'Customer Description': '',
            'Customer Email': 'jley@gmail.com',
            'Captured': true,
            'CardID': 'card_1IRMnbId3XBXXz6YnqD8l1ph',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70763,
            'type': 'card_payment',
            'partnerId': 1,
            'payorId': '',
            'timeZone': 'America/Los_Angeles',
            'contractNumber': 'WSC-2021202',
            'currentUserId': 35,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyMiRId3XBXXz6Yf0LM4AKW',
            'Description': 'Payment for agreement WSC-2021202',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 20:00',
            'Amount': 635,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 635,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt WSC-2021202',
            'CustomerID': 'cus_J3TljBELBQuvH2',
            'Customer Description': '',
            'Customer Email': 'jley@gmail.com',
            'Captured': true,
            'CardID': 'card_1IRMnbId3XBXXz6YnqD8l1ph',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70763,
            'type': 'card_payment',
            'partnerId': 1,
            'payorId': '',
            'timeZone': 'America/Los_Angeles',
            'contractNumber': 'WSC-2021202',
            'currentUserId': 35,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyMWqId3XBXXz6Y4sox0j2b',
            'Description': 'Payment for agreement 2021PNC01232',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 19:48',
            'Amount': 8596.09,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 8596.09,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNC01232',
            'CustomerID': 'cus_JbY4O3TFZ0zxJl',
            'Customer Description': '',
            'Customer Email': 'xim8212@yahoo.com',
            'Captured': true,
            'CardID': 'card_1IyKyZId3XBXXz6YZdpGH1YN',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70661,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289305,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNC01232',
            'currentUserId': 94,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyMEJId3XBXXz6YUVX7gcCG',
            'Description': 'Payment for agreement 2021PNF01255',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 19:29',
            'Amount': 104.03,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 104.03,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNF01255',
            'CustomerID': 'cus_JbZM2h931Kn98K',
            'Customer Description': '',
            'Customer Email': 'vilchez23@att.net',
            'Captured': true,
            'CardID': 'card_1IyME8Id3XBXXz6YfBd6DJgS',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70764,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289298,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNF01255',
            'currentUserId': 26,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyM9bId3XBXXz6YS6jpvTo9',
            'Description': 'Payment for agreement 2021PNF01233',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 19:24',
            'Amount': 609,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 609,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNF01233',
            'CustomerID': 'cus_JbXnfE8gm9FVDW',
            'Customer Description': '',
            'Customer Email': 'xim8212@yahoo.com',
            'Captured': true,
            'CardID': 'card_1IyKhXId3XBXXz6Y8wCduj18',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70671,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289291,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNF01233',
            'currentUserId': 94,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyM8EId3XBXXz6YxB8hXUFs',
            'Description': 'Payment for agreement 2021PNF01233',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 19:23',
            'Amount': 609,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 609,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNF01233',
            'CustomerID': 'cus_JbXnfE8gm9FVDW',
            'Customer Description': '',
            'Customer Email': 'xim8212@yahoo.com',
            'Captured': true,
            'CardID': 'card_1IyKhXId3XBXXz6Y8wCduj18',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70671,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289291,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNF01233',
            'currentUserId': 94,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyM1eId3XBXXz6YzcfphwI1',
            'Description': 'Payment for agreement 2021PNF01236',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 19:16',
            'Amount': 609,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 609,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNF01236',
            'CustomerID': 'cus_JbY4O3TFZ0zxJl',
            'Customer Description': '',
            'Customer Email': 'xim8212@yahoo.com',
            'Captured': true,
            'CardID': 'card_1IyKyZId3XBXXz6YZdpGH1YN',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70677,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289294,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNF01236',
            'currentUserId': 94,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyLzpId3XBXXz6YZ0C5Z4nN',
            'Description': 'Payment for agreement 2021PNF01236',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 19:14',
            'Amount': 609,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 609,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNF01236',
            'CustomerID': 'cus_JbY4O3TFZ0zxJl',
            'Customer Description': '',
            'Customer Email': 'xim8212@yahoo.com',
            'Captured': true,
            'CardID': 'card_1IyKyZId3XBXXz6YZdpGH1YN',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70677,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289294,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNF01236',
            'currentUserId': 94,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyLw4Id3XBXXz6Ygj8r2F2r',
            'Description': 'Payment for agreement 2021CFS00831',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 19:10',
            'Amount': 2084.23,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 2084.23,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021CFS00831',
            'CustomerID': 'cus_JbZ3339Cft8CWa',
            'Customer Description': '',
            'Customer Email': 'lgmonte@aol.com',
            'Captured': true,
            'CardID': 'card_1IyLvvId3XBXXz6YqqtuoQbR',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70327,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 288082,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021CFS00831',
            'currentUserId': 68,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyLeUId3XBXXz6YD0L5HZEQ',
            'Description': 'Payment for agreement 2021PNC00411',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 18:52',
            'Amount': 5000,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 5000,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNC00411',
            'CustomerID': 'cus_JbYgcQr7NFS6Qx',
            'Customer Description': '',
            'Customer Email': 'jasonlaosays@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyLeQId3XBXXz6YjeM33d1O',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 67740,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 280678,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNC00411',
            'currentUserId': 34,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyLcHId3XBXXz6YbekzJwh4',
            'Description': 'Payment for agreement 2021PNC00411',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 18:50',
            'Amount': 5500,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 5500,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNC00411',
            'CustomerID': 'cus_JbYgcQr7NFS6Qx',
            'Customer Description': '',
            'Customer Email': 'jasonlaosays@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyLc9Id3XBXXz6YnWkHBXWJ',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 67740,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 280678,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNC00411',
            'currentUserId': 34,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyLavId3XBXXz6Y8hjQA4Ar',
            'Description': 'Payment for agreement 2021CFS00838',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 18:48',
            'Amount': 234.89,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 234.89,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021CFS00838',
            'CustomerID': 'cus_JarVe1Wqokt89Z',
            'Customer Description': '',
            'Customer Email': 'catherine_w@btinternet.com',
            'Captured': true,
            'CardID': 'card_1IxfmEId3XBXXz6YhsnS0Vp3',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70382,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 288406,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021CFS00838',
            'currentUserId': 76,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyLaHId3XBXXz6YvamreK8X',
            'Description': 'Payment for agreement 2021PNC00411',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 18:48',
            'Amount': 5500,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 5500,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNC00411',
            'CustomerID': 'cus_JbYgcQr7NFS6Qx',
            'Customer Description': '',
            'Customer Email': 'jasonlaosays@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyLa6Id3XBXXz6YLLUfG333',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 67740,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 280678,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNC00411',
            'currentUserId': 34,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyLZjId3XBXXz6YL6njJhxX',
            'Description': 'Payment for agreement 2021ACC00121',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 18:47',
            'Amount': 1040,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 1040,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021ACC00121',
            'CustomerID': 'cus_JTsueJCM2wZycM',
            'Customer Description': '',
            'Customer Email': 'a@gmail.com',
            'Captured': true,
            'CardID': 'card_1Iqv8kId3XBXXz6YYovNOa49',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70515,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 287908,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021ACC00121',
            'currentUserId': 46,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyLYrId3XBXXz6YTzMg1rDp',
            'Description': 'Payment for agreement 2021PNC00411',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 18:46',
            'Amount': 5500,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 5500,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNC00411',
            'CustomerID': 'cus_JbYgcQr7NFS6Qx',
            'Customer Description': '',
            'Customer Email': 'jasonlaosays@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyLYnId3XBXXz6YMAWQqLT0',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 67740,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 280678,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNC00411',
            'currentUserId': 34,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyLWGId3XBXXz6YgIa9ump8',
            'Description': 'Payment for agreement 2021ACC00121',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 18:43',
            'Amount': 1040,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 1040,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021ACC00121',
            'CustomerID': 'cus_JaoCQYdllSfDi6',
            'Customer Description': '',
            'Customer Email': 'gpreciousbaby@aol.com',
            'Captured': true,
            'CardID': 'card_1IxcZnId3XBXXz6YZukDuD2N',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70515,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 288370,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021ACC00121',
            'currentUserId': 46,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyKz1Id3XBXXz6YxJstFDZi',
            'Description': 'Payment for agreement 2021PNF01236',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 18:09',
            'Amount': 5816.53,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 5816.53,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNF01236',
            'CustomerID': 'cus_JbY4O3TFZ0zxJl',
            'Customer Description': '',
            'Customer Email': 'xim8212@yahoo.com',
            'Captured': true,
            'CardID': 'card_1IyKyZId3XBXXz6YZdpGH1YN',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70677,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289294,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNF01236',
            'currentUserId': 94,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyKsIId3XBXXz6YcfHvaj9I',
            'Description': 'Payment for agreement AA122585',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 18:02',
            'Amount': 2918.52,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 2918.52,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt AA122585',
            'CustomerID': 'cus_JbXyj3EtuY3vqa',
            'Customer Description': '',
            'Customer Email': '',
            'Captured': true,
            'CardID': 'card_1IyKsCId3XBXXz6Yop4RYKuT',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 46705,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 139659,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': 'AA122585',
            'currentUserId': 124,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyKixId3XBXXz6YLQiEoHqC',
            'Description': 'Payment for agreement 2021ANC00858',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 17:52',
            'Amount': 14000,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 14000,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021ANC00858',
            'CustomerID': 'cus_JZ207YeSIGcdAX',
            'Customer Description': '',
            'Customer Email': 'qingh7@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyKiiId3XBXXz6YNHoDJ4df',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70514,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 287298,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021ANC00858',
            'currentUserId': 49,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyKhgId3XBXXz6YGLyxxFcZ',
            'Description': 'Payment for agreement 2021PNF01233',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 17:51',
            'Amount': 5816.53,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 5816.53,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNF01233',
            'CustomerID': 'cus_JbXnfE8gm9FVDW',
            'Customer Description': '',
            'Customer Email': 'xim8212@yahoo.com',
            'Captured': true,
            'CardID': 'card_1IyKhXId3XBXXz6Y8wCduj18',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70671,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289291,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNF01233',
            'currentUserId': 94,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyKhTId3XBXXz6Yqhk82BZ1',
            'Description': 'Payment for agreement 2021ANC00858',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 17:51',
            'Amount': 6000,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 6000,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021ANC00858',
            'CustomerID': 'cus_JZ207YeSIGcdAX',
            'Customer Description': '',
            'Customer Email': 'qingh7@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyKhJId3XBXXz6Ygwx86lD0',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70514,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 287298,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021ANC00858',
            'currentUserId': 49,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyKgdId3XBXXz6YPo7NnSn8',
            'Description': 'Payment for agreement 2021ANC00858',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 17:50',
            'Amount': 2000,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 2000,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021ANC00858',
            'CustomerID': 'cus_JZ207YeSIGcdAX',
            'Customer Description': '',
            'Customer Email': 'qingh7@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyKgUId3XBXXz6YYInvwf9R',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70514,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 287298,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021ANC00858',
            'currentUserId': 49,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyKfiId3XBXXz6YZ7jycGNK',
            'Description': 'Payment for agreement 2021ANC00858',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 17:49',
            'Amount': 3000,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 3000,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021ANC00858',
            'CustomerID': 'cus_JZ207YeSIGcdAX',
            'Customer Description': '',
            'Customer Email': 'qingh7@gmail.com',
            'Captured': true,
            'CardID': 'card_1IyKfSId3XBXXz6Y63y4iDG7',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70514,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 287298,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021ANC00858',
            'currentUserId': 49,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyKPwId3XBXXz6Y1amvqtCF',
            'Description': 'Payment for agreement 2021PNC01196',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 17:33',
            'Amount': 10178.58,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 10178.58,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNC01196',
            'CustomerID': 'cus_JZQkEDMOSrF6EB',
            'Customer Description': '',
            'Customer Email': 'josiedml@aol.com',
            'Captured': true,
            'CardID': 'card_1IwHssId3XBXXz6YC3HB3qkP',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70575,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 288090,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNC01196',
            'currentUserId': 27,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyKMdId3XBXXz6YIGaERsbE',
            'Description': 'Payment for agreement 2021PNC01232',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 17:29',
            'Amount': 9422.02,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 9422.02,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021PNC01232',
            'CustomerID': 'cus_JbXR14Nvra7ovW',
            'Customer Description': '',
            'Customer Email': 'xim8212@yahoo.com',
            'Captured': true,
            'CardID': 'card_1IyKMPId3XBXXz6YrSGaNzQr',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70661,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289282,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021PNC01232',
            'currentUserId': 94,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyJmdId3XBXXz6YHVj4y3bQ',
            'Description': 'Payment for agreement 2021SSO00133',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 16:52',
            'Amount': 1,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 1,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021SSO00133',
            'CustomerID': 'cus_J2hzDM2yBsJNdi',
            'Customer Description': '',
            'Customer Email': 'aytony@gmail.com',
            'Captured': true,
            'CardID': 'card_1IagniId3XBXXz6YIX2NxHil',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70494,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289281,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021SSO00133',
            'currentUserId': 13,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyJm1Id3XBXXz6YZYMmcVe1',
            'Description': 'Payment for agreement 2021ACC00120',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 16:52',
            'Amount': 1016,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 1016,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021ACC00120',
            'CustomerID': 'cus_JbWpU1AIxZKBhP',
            'Customer Description': '',
            'Customer Email': 'alredmond59@yahoo.com',
            'Captured': true,
            'CardID': 'card_1IyJlvId3XBXXz6YQ7l11aMa',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70493,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289278,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021ACC00120',
            'currentUserId': 46,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyJkaId3XBXXz6YzgtiIl4b',
            'Description': 'Payment for agreement 2021CFS00346',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 16:50',
            'Amount': 1,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 1,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021CFS00346',
            'CustomerID': 'cus_J2hzDM2yBsJNdi',
            'Customer Description': '',
            'Customer Email': 'aytony@gmail.com',
            'Captured': true,
            'CardID': 'card_1IagniId3XBXXz6YIX2NxHil',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 64964,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 279398,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021CFS00346',
            'currentUserId': 13,
            'paymentType': 4
        },
        {
            'id': 'ch_1IyJS6Id3XBXXz6Yg92E2kh7',
            'Description': 'Payment for agreement 2021SSO00133',
            'Seller Message': 'Payment complete.',
            'Created (UTC)': '2021-06-03 16:31',
            'Amount': 3444.13,
            'Amount Refunded': 0,
            'Currency': 'usd',
            'Converted Amount': 3444.13,
            'Converted Amount Refunded': 0,
            'Fee': 0,
            'Tax': 0,
            'Converted Currency': 'usd',
            'Status': 'Paid',
            'Statement Descriptor': 'CL pmt 2021SSO00133',
            'CustomerID': 'cus_JbWUe9x97nNa4q',
            'Customer Description': '',
            'Customer Email': 'amytakemori@yahoo.com',
            'Captured': true,
            'CardID': 'card_1IyJRyId3XBXXz6YGgzLfrXH',
            'Invoice ID': '',
            'Transfer': '',
            'resourceId': 70494,
            'type': 'card_payment',
            'partnerId': '',
            'payorId': 289276,
            'timeZone': 'America/Los_Angeles',
            'contractNumber': '2021SSO00133',
            'currentUserId': 53,
            'paymentType': 4
        }
        ] */

        const preprodArry = [
            {
                'id': 'ch_1IyYdlId3XBXXz6YYvzU2oIU',
                'Description': 'Payment for agreement 2021CFS00087',
                'Seller Message': 'Payment complete.',
                'Created (UTC)': '2021-06-04 08:44',
                'Amount': 1200,
                'Amount Refunded': 0,
                'Currency': 'usd',
                'Converted Amount': 1200,
                'Converted Amount Refunded': 0,
                'Fee': 0,
                'Tax': 0,
                'Converted Currency': 'usd',
                'Status': 'Paid',
                'Statement Descriptor': 'CL pmt 2021CFS00087',
                'CustomerID': 'cus_JN7deWkMWgVJho',
                'Customer Description': '',
                'Customer Email': 'a@gmail.com',
                'Captured': true,
                'CardID': 'card_1IkiXGDTjpcWNPkqsE5jrhXh',
                'Invoice ID': '',
                'Transfer': '',
                'resourceId': 62329,
                'type': 'card_payment',
                'partnerId': '',
                'payorId': 223942,
                'timeZone': 'America/Los_Angeles',
                'contractNumber': '2021CFS00087',
                'currentUserId': 13,
                'paymentType': 4
            },
            {
                'id': 'ch_1IyYdRId3XBXXz6YW73jWtAk',
                'Description': 'Payment for agreement 2021CFS00086',
                'Seller Message': 'Payment complete.',
                'Created (UTC)': '2021-06-04 08:44',
                'Amount': 100,
                'Amount Refunded': 0,
                'Currency': 'usd',
                'Converted Amount': 100,
                'Converted Amount Refunded': 0,
                'Fee': 0,
                'Tax': 0,
                'Converted Currency': 'usd',
                'Status': 'Paid',
                'Statement Descriptor': 'CL pmt 2021CFS00086',
                'CustomerID': 'cus_J8ckOy1pP3qgVR',
                'Customer Description': '',
                'Customer Email': 'a@gmail.com',
                'Captured': true,
                'CardID': 'card_1IWLUhDTjpcWNPkqjAdCBg7f',
                'Invoice ID': '',
                'Transfer': '',
                'resourceId': 62319,
                'type': 'card_payment',
                'partnerId': '',
                'payorId': 223943,
                'timeZone': 'America/Los_Angeles',
                'contractNumber': '2021CFS00086',
                'currentUserId': 13,
                'paymentType': 4
            }
        ]
        await asyncForEach(preprodArry, async (ele) => {
            let transaction = await models.sequelize.transaction()
            try {
                rollbar.log('hmis_down_sync_payments', ele)
                logger.info(`Missed Payments insertion seed ${ele.contractNumber} at ${new Date()}`)
                const receiptNumber = await PaymentController.getArrangementTypeAndCreateReceiptNo(ele.resourceId, transaction)
                const fetchCardDetails = await stripeClient.retrieveCard(ele.CustomerID, ele.CardID)
                let otherInfoData = {
                    cardType: '',
                    lastDigits: '',
                    brand: '',
                    billingAddress: {}
                }
                if (fetchCardDetails) {
                    otherInfoData = {
                        cardType: fetchCardDetails.funding,
                        lastDigits: fetchCardDetails.last4,
                        brand: fetchCardDetails.brand.toLowerCase(),
                        billingAddress: {}
                    }
                }
                const paymentObject = {
                    referenceNumber: null,
                    receiptNumber: receiptNumber,
                    transactionId: ele.id,
                    resourceId: ele.resourceId,
                    addendumId: null,
                    resourceType: 'Agreement',
                    payorId: ele.payorId ? ele.payorId : null,
                    partnerId: ele.partnerId ? ele.partnerId : null,
                    amount: ele.Amount,
                    paymentType: ele.paymentType,
                    status: ele.Status === 'Paid' ? 'success' : 'failed',
                    createdBy: ele.currentUserId,
                    createdAt: moment(ele.Created),
                    cardId: ele.CardID,
                    remarks: null,
                    otherInfo: JSON.stringify(otherInfoData),
                    receiptUrl: null,
                    receivedBy: ele.currentUserId,
                    emailUrl: null
                }

                const payment = await models.Payment.create(paymentObject, { transaction })
                // let cashCreatedAt = ele.cashCreatedAt && ele.cashCreatedAt.split(' ')[0] ? moment(ele.cashCreatedAt.split(' ')[0], 'YYYYMMDD HHMMSSSS') : new Date()
                rollbar.info('hmis down sync payment created', ele)
                if (payment) {
                    let agreementFinance = await models.AgreementFinance.findOne({
                        where: {
                            agreementId: ele.resourceId
                        },
                        transaction
                    })
                    if (agreementFinance) {
                        const financeController = new FinanceController(ele.resourceId)
                        await financeController.addPaymentToSchedule(payment, payment.amount, transaction)
                        logger.info(`Missed Payments insertion seed finance sec ended ${new Date()}`)
                    }
                    logger.info(`Missed Payments insertion seed total process started ${new Date()}`)
                    await models.Agreement.updateTotalPaidAndDue(ele.resourceId, 1, transaction)
                    logger.info(`Missed Payments insertion seed total process ended ${new Date()}`)
                }
                logger.info(`Missed Payments insertion seed before commit ${new Date()}`)
                await transaction.commit()
                logger.info(`Missed Payments insertion seed after commit ${new Date()}`)
            } catch (err) {
                rollbar.error('hmis_down_sync_payments_error', err, ele)
                await transaction.rollback()
                logger.error(err)
                logger.error(`Something went wrong with Missed Payments insertion seed`)
                done(err)
            }
        })
    } catch (error) {
        console.log(error)
        throw error
    }
}

async function upSyncPayments (req, res) {
    try {
        const { queues, queueNames } = require('./index')
        const hmisSyncQueue = queues[queueNames.sync_cron_job]
        logger.info('up sync payments job started')
        hmisSyncQueue.add('sync_cron_job', req.query)
        return true
    } catch (error) {
        logger.info('up sync payments job error')
        throw error
    }
}
async function downSyncPayments () {
    try {
        const { queues, queueNames } = require('./index')
        const hmisSyncQueue = queues[queueNames.hmis_to_oneportal_payments_sync_cron_job]
        logger.info('down sync payments job started')
        hmisSyncQueue.add('hmis_to_oneportal_payments_sync_cron_job', null)
        return true
    } catch (error) {
        logger.info('down sync payments job error')
        throw error
    }
}
module.exports = {
    syncContractToHmis,
    syncAddendumToHmis,
    hmisSyncCronJob,
    hmisToOneportalPaymentCronJOb,
    insertMissedPaymentsToDB,
    updatePaymentLog,
    insertToPaymentLog,
    upSyncPayments,
    downSyncPayments
}
