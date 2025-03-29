const { customResponse } = require('../../../lib/custom-response')
const VerifiedPersonController = require('../../../controllers/refactorControllers/personController/verifiedPersonController')
const { sendErrorResponse } = require('../../../lib/errorResponse')
const PersonController = require('../../../controllers/refactorControllers/personController/personController')
const CertifierAndOrganisationReportController = require('../../../controllers/refactorControllers/personController/certifierAndOrganisationReportController')
const logger = require('../../../lib/logger')
const Json2csvParser = require('json2csv').Parser
const _ = require('lodash')
const { getFullNameOfPerson } = require('../../../controllers/refactorControllers/utils')
async function getCertifierDetails (req, res, next) {
    try {
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const certifierDetails = await verifiedPersonController.getCerifierDetails()
        customResponse(200, certifierDetails, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function updateCertifierDetails (req, res, next) {
    try {
        let reqBody = {
            ...req.body,
            userId: req.currentUser.id
        }
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const certifierDetails = await verifiedPersonController.setCertfierDetails(reqBody)
        customResponse(200, certifierDetails, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function searchCertifier (req, res, next) {
    try {
        const certifiers = await PersonController.searchCertifier(req.query.searchTerm)
        customResponse(200, certifiers, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function duplicateCertifierReport (req, res, next) {
    try {
        const certifiers = await CertifierAndOrganisationReportController.getDuplicateCertifierReport(req.query)
        customResponse(200, certifiers, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
async function exportDuplicateCertifierReport (req, res, next) {
    try {
        let data = await CertifierAndOrganisationReportController.getDuplicateCertifierReport(req.query, true)
        if (data.length) {
            let exportRes = data.map((e, key) => {
                const decedentName = getFullNameOfPerson(e.decedent)
                return {
                    'Certifier': `${e.licenseNum} - ${decedentName}\n${e.address}`,
                    'Created By': _.get(e, 'createdBy'),
                    'Created On': _.get(e, 'createdOn'),
                    'Potential Duplicates': e.duplicateCertifiers.map(duplicate => {
                        return `${duplicate.licenseNum} - ${duplicate.decedent}\n${duplicate.address}`
                    }).join(',')
                }
            })
            const json2csvParser = new Json2csvParser({ excelStrings: true })
            const csv = json2csvParser.parse(exportRes)
            res.attachment('duplicateCertificateReport.csv')
            res.send(Buffer.from(csv))
        } else {
            res.json({
                success: true,
                msg: 'No records found'
            })
        }
    } catch (error) {
        logger.error(error)
        next(error)
    }
}
async function duplicateOrganization (req, res, next) {
    try {
        const certifiers = await CertifierAndOrganisationReportController.getDuplicateOrganizationReport(req.query)
        customResponse(200, certifiers, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
async function exportDuplicateOrganization (req, res, next) {
    try {
        let data = await CertifierAndOrganisationReportController.getDuplicateOrganizationReport(req.query, true)
        if (data.length) {
            let exportRes = data.map((e, key) => {
                return {
                    'Organization': `${e.facilityName}\n${e.address}`,
                    'Created By': _.get(e, 'createdBy'),
                    'Created On': _.get(e, 'createdOn'),
                    'Potential Duplicates': e.duplicateOrganization.map(duplicate => {
                        return `${duplicate.facilityName}\n${duplicate.address}`
                    }).join(',')
                }
            })
            const json2csvParser = new Json2csvParser({ excelStrings: true })
            const csv = json2csvParser.parse(exportRes)
            res.attachment('duplicateOrganizationReport.csv')
            res.send(Buffer.from(csv))
        } else {
            res.json({
                success: true,
                msg: 'No records found'
            })
        }
    } catch (error) {
        logger.error(error)
        next(error)
    }
}

module.exports = {
    getCertifierDetails,
    updateCertifierDetails,
    searchCertifier,
    duplicateCertifierReport,
    exportDuplicateCertifierReport,
    duplicateOrganization,
    exportDuplicateOrganization
}
