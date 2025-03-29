const moment = require('moment')
const logger = require('../lib/logger')
const Json2csvParser = require('json2csv').Parser
const Email = require('../lib/Emailer/core')
const db = require('../models/index')
const { convertToJsonRecursive } = require('../controllers/refactorControllers/utils')
const fs = require('fs')
const util = require('util')
const writeFileAsync = util.promisify(fs.writeFile)
const unlink = util.promisify(fs.unlink)
const realpath = util.promisify(fs.realpath)
const _ = require('lodash')
const seedData = require('../config/seed').seed
const agreementType = _.get(seedData, 'ContractType')
const paymentType = {
    1: 'Cash',
    2: 'Check',
    3: 'Money order',
    4: 'Card',
    5: 'Preneed/insurance payment',
    6: 'Email Request',
    7: 'Void Check'
}

async function queryObjWhereForPaymentReceipt (queryObj) {
    const {
        paymentDateFrom,
        paymentDateTo,
        timezone
    } = queryObj
    let sql = ` WHERE [Payment].[status] != 'voided'`
    if (paymentDateFrom && paymentDateTo) {
        let startDate = moment(paymentDateFrom)
            .tz(timezone)
            .startOf('day')
            .format('YYYY/MM/DD')
        let endDate = moment(paymentDateTo)
            .tz(timezone)
            .endOf('day')
            .format('YYYY/MM/DD')
        sql += ` AND [Payment].[createdAt] BETWEEN '${startDate}' AND '${endDate}'`
    }
    return sql
}

async function getReport () {
    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - 1)
    const paymentDateFrom = dateFrom.toISOString()
    dateFrom.setDate(dateFrom.getDate() + 1)
    const paymentDateTo = dateFrom.toISOString()
    const timezone = moment.tz.guess()
    const sort = 'desc'
    try {
        let whereQuery = await queryObjWhereForPaymentReceipt({ paymentDateFrom, paymentDateTo, timezone })
        let query = `SELECT [Payment].[id],
            [Payment].[payorId],
            [Payment].[paymentType],
            [Payment].[amount],
            [Payment].[createdAt],
            [Payment].[receiptNumber],
            [Payment].[receivedBy],
            [decedent].[id] as decedentId,
            ( SELECT [Agreement].[id] AS id,
                [Agreement].[contractNumber] as contractNumber ,
                [Agreement].[status] as status ,
                [Agreement].[type] as type ,
                [Agreement].[arrangerId] as arrangerId,
                ( SELECT [arranger].[id] as id, [arranger].[name] as name FOR JSON PATH, WITHOUT_ARRAY_WRAPPER ) as arranger
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            ) as Agreement,
            (Select [User].[id] as id, [User].[name] as name FOR JSON PATH, WITHOUT_ARRAY_WRAPPER ) as [User]
                FROM [Payment] AS [Payment]
                LEFT OUTER JOIN [Agreement] AS [Agreement] ON [Payment].[resourceId] = [Agreement].[id]
                OUTER APPLY (
                    SELECT TOP 1
                    [decedent].[id] AS [id], [decedent].[firstName] AS [firstName], [decedent].[middleName] AS [middleName], [decedent].[lastName] AS [lastName], [decedent].[isAlive] AS [isAlive], [decedent].[id] AS [pvdId], [personVerificationDetails].[onePortalId] AS [onePortalId], [personVerificationDetails].[ssn] AS [ssn]
                    FROM AgreementPerson agp
                    LEFT JOIN [Person] AS [decedent] ON [agp].[personId] = [decedent].[id]
                    LEFT JOIN [PersonVerificationDetails] AS [personVerificationDetails] ON [decedent].[id] = [personVerificationDetails].[personId]
            WHERE Agreement.id = agp.agreementId AND agp.roleId = 3 and agp.deletedAt is null ) as decedent
            LEFT OUTER JOIN [Employee] AS [arranger] ON [Agreement].[arrangerId] = [arranger].[id]
            LEFT OUTER JOIN [User] AS [User] ON [Payment].[receivedBy] = [User].[id]
        ${whereQuery} ORDER BY [Payment].[updatedAt] ${sort}`
        const paymentReceiptList = await db.sequelize.query(query, {
            type: db.sequelize.QueryTypes.SELECT
        })
        paymentReceiptList.map(e => convertToJsonRecursive(e))
        return paymentReceiptList
    } catch (error) {
        logger.error(error)
    }
}
async function cashReceiptReportWorker (job, done) {
    try {
        const timezone = moment.tz.guess()
        const sendTo = 'w@gmail.com'
        const subject = `Daily Cash Receipt Report - ${moment.tz(timezone).format('LL')}`
        let data = await getReport()
        if (data.length) {
            const text = `Hello, \n\n Please find the attached Cash Receipt Report for the day ${moment.tz(timezone).format('LLL')}. \n\n -OnePortal`
            let exportRes = data.map((e, key) => {
                return {
                    'AGREEMENT NUMBER': _.get(e, 'Agreement.contractNumber'),
                    'AGREEMENT STATUS': _.get(e, 'Agreement.status'),
                    'FUNERAL/CEMETERY': agreementType[_.get(e, 'Agreement.type')],
                    'ARRANGER': _.get(e, 'Agreement.arranger.name'),
                    'PAYMENT TYPE': paymentType[_.get(e, 'paymentType')],
                    'AMOUNT': _.get(e, 'amount'),
                    'DATE-TIME': moment(e.createdAt).tz(timezone).format('LLL'),
                    'RECEIPT #': _.get(e, 'receiptNumber'),
                    'RECEIVED BY': _.get(e, 'User.name')
                }
            })
            const json2csvParser = new Json2csvParser({ excelStrings: true })
            const csv = json2csvParser.parse(exportRes)
            let csvName = './' + Date.now() + '.csv'
            await writeFileAsync(csvName, csv)
            const csvFile = await realpath(csvName)
            await Email.sendMail(sendTo, subject, text, csvFile, 'cashReceiptReport.csv')
            await unlink(csvFile)
        } else {
            const text = `Hello,\n\n There are no transactions to generate a Cash Receipt Report for the day ${moment.tz(timezone).format('LLL')}.\n\n -OnePortal`
            await Email.sendMail(sendTo, subject, text)
        }
        done(null, { success: true, jobId: job.id })
        logger.info(`Cash receipt report is sent succesfully`)
    } catch (e) {
        logger.info(`Failed Synced Funeral Agreement Report job # + ${JSON.stringify(job.id)}  ' ----> ' ${JSON.stringify(e)}`)
        done(e)
    }
}
module.exports = {
    cashReceiptReportWorker
}
