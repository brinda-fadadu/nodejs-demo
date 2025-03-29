const moment = require('moment')
const Json2csvParser = require('json2csv').Parser
const _ = require('lodash')
const logger = require('../../lib/logger')
const { customResponse } = require('../../lib/custom-response')
const { getFullNameOfPerson } = require('../../controllers/refactorControllers/utils')
const AgreementController = require('../../controllers/refactorControllers/agreementController/agreementController')
const ANRemainsController = require('../../controllers/refactorControllers/personController/anRemainsController')
const SchedulingController = require('../../controllers/refactorControllers/schedulingController/schedulingController')

async function listOfTransfers (req, res, next) {
    try {
        const anRemainsController = new ANRemainsController()
        const data = await anRemainsController.listofDecedents(req.query)
        customResponse(200, data, res)
    } catch (error) {
        customResponse(400, error, res)
    }
}

// GET /export API - Exports based on filter or onePortalIds
async function exportDecdents (req, res, next) {
    try {
        const anRemainsController = new ANRemainsController()
        let data = await anRemainsController.listofDecedents(req.query)
        if (data.list.length) {
            let exportRes = data.list.map((e, key) => {
                return {
                    'Transfer Date': e.transferDateTime ? moment(e.transferDateTime).tz(req.query.timezone).format('MM/DD/YYYY') : null,
                    'Transfer To Location': _.get(e, 'transferToPlace.name'),
                    'Prep Room Location': _.get(e, 'transferToPrep.name'),
                    'Transfer Number': e.identifier,
                    'Decedent Name': getFullNameOfPerson(e.decedent),
                    'Arranger': _.get(e.arranger, 'name'),
                    'STATUS': e.status,
                    'Case Completion Date': e.completedOn ? moment(e.completedOn).tz(req.query.timezone).format('MM/DD/YYYY') : null,
                    'Case #': _.get(e.case, 'identifier'),
                    'Embalming': e.embalming,
                    'Cremation': e.cremation,
                    'Cremation Date': e.cremationDate ? moment(e.cremationDate).tz(req.query.timezone).format('MM/DD/YYYY') : null
                }
            })
            const json2csvParser = new Json2csvParser({ excelStrings: true })
            const csv = json2csvParser.parse(exportRes)
            res.attachment('decedentTracking.csv')
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
async function openCasesList (req, res, next) {
    try {
        const agreementController = new AgreementController()
        const data = await agreementController.getListOfOpenCases(req.query)
        customResponse(200, data, res)
    } catch (error) {
        customResponse(400, error, res)
    }
}

async function exportOpenCaseReport (req, res, next) {
    try {
        const agreementController = new AgreementController()
        let data = await agreementController.getListOfOpenCases(req.query, true)
        if (data.list.length) {
            let exportRes = data.list.map((e, key) => {
                return {
                    'Statement #': _.get(e.statement, 'statementNumber', null),
                    'Call Date': e.callDate ? moment(e.callDate).tz(req.query.timezone).format('MM/DD/YYYY') : null,
                    'Case Date': e.statement && e.statement.caseDate ? moment(e.statement.caseDate).tz(req.query.timezone).format('MM/DD/YYYY') : null,
                    'STATUS': _.get(e.statement, 'status'),
                    'Cemetery/Funeral': _.get(e.statement, 'type'),
                    'Location': _.get(e.location, 'name'),
                    'Arranger': _.get(e.arranger, 'name'),
                    'Decedent/Beneficiary Name': getFullNameOfPerson(e.decedent),
                    'Item Added': _.get(e.schedulingDetails, 'itemAdded'),
                    'Scheduling Started': _.get(e.schedulingDetails, 'schedulingStarted'),
                    'Open Work Orders': e.openWorkOrders,
                    'Days Until Service': _.get(e.schedulingDetails, 'daysUntilService')
                }
            })
            const json2csvParser = new Json2csvParser({ excelStrings: true })
            const csv = json2csvParser.parse(exportRes)
            res.attachment('openCasesReport.csv')
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
async function temporialBurialReport (req, res, next) {
    try {
        const schedulingController = new SchedulingController()
        const data = await schedulingController.temporialBurialReport(req.query)
        customResponse(200, data, res)
    } catch (error) {
        customResponse(400, error, res)
    }
}
async function exportTemporialBurialReport (req, res, next) {
    try {
        const schedulingController = new SchedulingController()
        let data = await schedulingController.temporialBurialReport(req.query, true)
        if (data.length) {
            let exportRes = data.map((e, key) => {
                return {
                    'Contract #': _.get(e.contract, 'contractNumber', null),
                    'STATUS': _.get(e.contract, 'status'),
                    'Decedent/Beneficiary Name': getFullNameOfPerson(e.decedent),
                    'Burial Date': _.get(e, 'burialInformation.burialDate') ? moment(e.burialInformation.burialDate).tz(req.query.timezone).format('MM/DD/YYYY HH:mm') : null,
                    'Arranger': _.get(e.arranger, 'name'),
                    'Purchased Burial Location': _.get(e, 'burialInformation.purchasedBurialLocation'),
                    'Temporary Burial Location': _.get(e, 'burialInformation.temporaryBurialLocation')
                }
            })
            const json2csvParser = new Json2csvParser({ excelStrings: true })
            const csv = json2csvParser.parse(exportRes)
            res.attachment('temporialBurialCaseReport.csv')
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
    listOfTransfers,
    exportDecdents,
    openCasesList,
    exportOpenCaseReport,
    temporialBurialReport,
    exportTemporialBurialReport
}
