/* eslint-disable no-undef */
const _ = require('lodash')
const momentTimeZone = require('moment-timezone')
const Json2csvParser = require('json2csv').Parser
const fs = require('fs')
const util = require('util')
const realpath = util.promisify(fs.realpath)
const unlink = util.promisify(fs.unlink)
const writeFileAsync = util.promisify(fs.writeFile)
const logger = require('../lib/logger')
const models = require('../models')
const seedValues = require('../config/seed')
const PersonController = require('../controllers/refactorControllers/personController/personController')
const Email = require('../lib/Emailer/core')

async function syncFuneralAgreementReportWorker (job, done) {
    logger.info(`Processing Synced Funeral Agreement Report job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
    try {
        const { sendTo, formattedStartDate, formattedEndDate, dateFilterQuery, timezone } = job.data

        let commonJoinQuery = `
        LEFT JOIN AgreementFinance ON AgreementFinance.agreementId = Agreement.id AND AgreementFinance.isActive = 1 AND AgreementFinance.isRecent = 1
        LEFT JOIN AgreementFinanceSchedule ON AgreementFinanceSchedule.agreementFinanceId = AgreementFinance.id
        INNER JOIN Location ON Location.id = Agreement.locationId
        INNER JOIN AgreementType ON AgreementType.id = Agreement.type
        INNER JOIN AgreementPerson AS beneficiaryAP ON beneficiaryAP.agreementId = Agreement.id AND beneficiaryAP.roleId = 3 AND beneficiaryAP.deletedAt IS NULL
        INNER JOIN Person AS beneficiaryP ON beneficiaryP.id = beneficiaryAP.personId
        INNER JOIN Place AS beneficiaryPl ON beneficiaryPl.id = beneficiaryP.addressPlaceId
        INNER JOIN Address AS benceficiaryAdd ON benceficiaryAdd.id = beneficiaryPl.addressId
        LEFT JOIN State AS benceficiaryState ON benceficiaryState.name = benceficiaryAdd.state
        INNER JOIN PersonVerificationDetails beneficiaryPVD ON beneficiaryPVD.personId = beneficiaryAP.personId
        INNER JOIN AgreementPerson AS purchaserAP ON purchaserAP.agreementId = Agreement.id AND purchaserAP.roleId = 1 AND purchaserAP.deletedAt IS NULL
        INNER JOIN Person AS purhcaserP ON purhcaserP.id = purchaserAP.personId
        INNER JOIN Place AS purchaserPl ON purchaserPl.id = purhcaserP.addressPlaceId
        INNER JOIN Address AS purchaserAdd ON purchaserAdd.id = purchaserPl.addressId
        LEFT JOIN State AS purchaserState ON purchaserState.name = purchaserAdd.state
        INNER JOIN PersonVerificationDetails purchaserPVD ON purchaserPVD.personId = purchaserAP.personId
        WHERE AgreementType.agreementType = 'Funeral'
        `

        let commonListingColumnsQuery = `
        Location.code AS fh,
        Agreement.totalCashPrice AS funeralAmount,
        Agreement.due AS balance,
        AgreementFinance.downPaymentAmount,
        purhcaserP.firstName AS purchaserFirstName,
        purhcaserP.middleName AS purchaserMiddleName,
        purhcaserP.lastName AS purchaserLastName,
        purhcaserP.suffix AS purchaserSuffix,
        purhcaserP.gender AS purchaserGender,
        purchaserPVD.ssnLastFour AS purchaserSSN,
        purchaserAdd.line1 AS purchaserAddress,
        purchaserAdd.line2 AS purchaserAddress2,
        purchaserAdd.city AS purchaserCity,
        purchaserState.code AS purchaserState,
        purchaserAdd.zipcode AS purchaserZip,
        purhcaserP.phoneNumber AS purchaserPhoneNumber,
        beneficiaryP.firstName AS beneficiaryFirstName,
        beneficiaryP.middleName AS beneficiaryMiddleName,
        beneficiaryP.lastName AS beneficiaryLastName,
        beneficiaryP.suffix AS beneficiarySuffix,
        beneficiaryP.gender AS beneficiaryGender,
        beneficiaryP.dateOfBirth AS beneficiaryDOB,
        benceficiaryAdd.line1 AS benceficiaryAddress,
        benceficiaryAdd.line2 AS benceficiaryAddress2,
        benceficiaryAdd.city AS beneficiaryCity,
        benceficiaryState.code AS beneficiaryState,
        benceficiaryAdd.zipcode AS beneficiaryZip,
        beneficiaryPVD.onePortalId,
        AgreementFinanceSchedule.expectedPaymentAmount,
        MAX(AgreementFinanceSchedule.paymentIndex) OVER (PARTITION BY AgreementFinanceSchedule.agreementFinanceId) AS payments`

        let detailQuery = `
            SELECT * FROM
            (SELECT
            Agreement.contractNumber AS trustContract,
            HMISDataSync.createdAt AS appSignDate,
            ${commonListingColumnsQuery}
            FROM Agreement
            INNER JOIN HMISDataSync ON HMISDataSync.agreementId = Agreement.id
            ${commonJoinQuery}
            AND CAST(HMISDataSync.createdAt AS DATE) ${dateFilterQuery}
            UNION
            SELECT
            Addendum.addendumNumber AS trustContract,
            HMISAddendumDataSync.createdAt AS appSignDate,
            ${commonListingColumnsQuery}
            FROM Addendum
            INNER JOIN Agreement ON Agreement.id = Addendum.agreementId
            INNER JOIN HMISAddendumDataSync ON HMISAddendumDataSync.addendumId = Addendum.id
            ${commonJoinQuery}
            AND CAST(HMISAddendumDataSync.createdAt AS DATE) ${dateFilterQuery}) AS syncedAgreementReport
            ORDER BY syncedAgreementReport.appSignDate ASC`
        // Fetching all the details for the agreement and addendum ids.
        let details = await models.sequelize.query(detailQuery, {
            type: models.sequelize.QueryTypes.SELECT,
            replacements: {
                formattedStartDate,
                formattedEndDate
            }
        })

        // Fetching  the complete SSN for the fetched records
        let ssnDetails = await PersonController.fetchSSN(details)

        const json2csvParser = new Json2csvParser({ excelStrings: true })
        let exportRes = [{
            'FH#': 'No Records Found',
            'TrustContract#': '',
            'AppSignDate': '',
            'CompleteSSN': '',
            'PurchaserFirstName': '',
            'PurchaserMiddleName': '',
            'PurchaserLastName': '',
            'PurchaserSuffix': '',
            'PurchaserGender': '',
            'PurchaserSSN': '',
            'PurchaserAddress': '',
            'PurchaserAddress2': '',
            'PurchaserCity': '',
            'PurchaserState': '',
            'PurchaserZip': '',
            'PurchaserPhone': '',
            'beneficiaryFirstName': '',
            'beneficiaryMiddleName': '',
            'beneficiaryLastName': '',
            'beneficiarySuffix': '',
            'beneficiaryGender': '',
            'beneficiaryDOB': '',
            'beneficiaryAddress': '',
            'beneficiaryAddress2': '',
            'beneficiaryCity': '',
            'beneficiaryState': '',
            'beneficiaryZip': '',
            'blank1': '',
            'blank2': '',
            'funeralAmount': '',
            'balance': '',
            'interestEarned': '',
            'trustedAmount': '',
            'retainedAmount': '',
            '#Pymts': '',
            'regularPayment': '',
            'downPayment': ''
        }]

        if (_.get(details, 'length')) {
            exportRes = details.map((e) => {
                let ssn = ssnDetails.find(item => item.onePortalId === e.onePortalId)
                return {
                    'FH#': _.get(e, 'fh', ''),
                    'TrustContract#': _.get(e, 'trustContract', ''),
                    'AppSignDate': _.get(e, 'appSignDate') ? momentTimeZone(_.get(e, 'appSignDate')).tz(timezone).format('MM/DD/YYYY') : '',
                    'CompleteSSN': !_.isEmpty(ssn) ? _.get(ssn, 'ssn', '') : '',
                    'PurchaserFirstName': _.get(e, 'purchaserFirstName', ''),
                    'PurchaserMiddleName': _.get(e, 'purchaserMiddleName', ''),
                    'PurchaserLastName': _.get(e, 'purchaserLastName', ''),
                    'PurchaserSuffix': _.get(e, 'purchaserSuffix', ''),
                    'PurchaserGender': _.get(e, 'purchaserGender') ? seedValues.seed.Gender[_.get(e, 'purchaserGender')] : null,
                    'PurchaserSSN': _.get(e, 'purchaserSSN', ''),
                    'PurchaserAddress': _.get(e, 'purchaserAddress', ''),
                    'PurchaserAddress2': _.get(e, 'purchaserAddress2', ''),
                    'PurchaserCity': _.get(e, 'purchaserCity', ''),
                    'PurchaserState': _.get(e, 'purchaserState', ''),
                    'PurchaserZip': _.get(e, 'purchaserZip', ''),
                    'PurchaserPhone': _.get(e, 'purchaserPhoneNumber', '') && !!Number(_.get(e, 'purchaserPhoneNumber', '')) && _.get(e, 'purchaserPhoneNumber', '').length === 10 ? `(${_.get(e, 'purchaserPhoneNumber', '').substring(0, 3)} ${_.get(e, 'purchaserPhoneNumber', '').substring(3, 6)}-${_.get(e, 'purchaserPhoneNumber', '').substring(6, 10)})` : '',
                    'beneficiaryFirstName': _.get(e, 'beneficiaryFirstName', ''),
                    'beneficiaryMiddleName': _.get(e, 'beneficiaryMiddleName', ''),
                    'beneficiaryLastName': _.get(e, 'beneficiaryLastName', ''),
                    'beneficiarySuffix': _.get(e, 'beneficiarySuffix', ''),
                    'beneficiaryGender': _.get(e, 'beneficiaryGender') ? seedValues.seed.Gender[_.get(e, 'beneficiaryGender')] : null,
                    'beneficiaryDOB': _.get(e, 'beneficiaryDOB') ? momentTimeZone(_.get(e, 'beneficiaryDOB')).tz(timezone).format('MM/DD/YYYY') : '',
                    'beneficiaryAddress': _.get(e, 'benceficiaryAddress', ''),
                    'beneficiaryAddress2': _.get(e, 'benceficiaryAddress2', ''),
                    'beneficiaryCity': _.get(e, 'beneficiaryCity', ''),
                    'beneficiaryState': _.get(e, 'beneficiaryState', ''),
                    'beneficiaryZip': _.get(e, 'beneficiaryZip', ''),
                    'blank1': '',
                    'blank2': '',
                    'funeralAmount': _.get(e, 'funeralAmount', ''),
                    'balance': _.get(e, 'balance', ''),
                    'interestEarned': '',
                    'trustedAmount': '',
                    'retainedAmount': '',
                    '#Pymts': _.get(e, 'payments', ''),
                    'regularPayment': _.get(e, 'expectedPaymentAmount', ''),
                    'downPayment': _.get(e, 'downPaymentAmount', '')
                }
            })
        }
        const csv = json2csvParser.parse(exportRes)

        let csvName = './' + Date.now() + '.csv'
        await writeFileAsync(csvName, csv)
        let csvFile = await realpath(csvName)
        await Email.sendMail(sendTo, 'OPI snapshot', 'OPI snapshot', csvFile, 'syncedAgreementReport.csv')
        await unlink(csvFile)
        logger.info(`Done Synced Funeral Agreement Report job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
        done(null, { data: job.data })
    } catch (e) {
        logger.info(`Failed Synced Funeral Agreement Report job # + ${JSON.stringify(job.id)}  ' ----> ' ${JSON.stringify(e)}`)
        done(e)
    }
}
module.exports = {
    syncFuneralAgreementReportWorker
}
