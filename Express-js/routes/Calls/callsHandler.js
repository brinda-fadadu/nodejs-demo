const CallController = require('../../controllers/refactorControllers/callController/callController')
const { customResponse } = require('../../lib/custom-response')
const moment = require('moment')
const Json2csvParser = require('json2csv').Parser
const logger = require('../../lib/logger')
const { getFullNameOfPerson } = require('../../controllers/refactorControllers/utils')

async function createOrEditCall (req, res, next) {
    try {
        let data = req.body
        data.userId = req.currentUser.id
        data.caseArranger = req.currentUser
        if (req.params.callId) {
            data.id = req.params.callId
        }
        const result = await CallController.createOrUpdate(data)

        res.status(200).json({
            success: true,
            call: result
        })
    } catch (err) {
        switch (err.message) {
        case 'INVALID_ONE_PORTAL_ID':
            err.message = 'Invalid one Portal Id'
            customResponse(400, err, res)
            break
        case 'INVALID_FIRST_NAME':
            err.message = 'Invalid First Name'
            customResponse(400, err, res)
            break
        case 'INVALID_LAST_NAME':
            err.message = 'Invalid Last Name'
            customResponse(400, err, res)
            break
        case 'INVALID_EMAIL':
            err.message = 'Invalid Email'
            customResponse(400, err, res)
            break
        case 'DECEDENT_NOT_FOUND':
            err.message = 'Decedent Info not found'
            customResponse(404, err, res)
            break
        default:
            customResponse(400, err, res)
            break
        }
    }
}

async function getCallInfo (req, res, next) {
    try {
        const callController = new CallController(req.params.callId)
        const result = await callController.getCallDetails()
        res.status(200).json({
            success: true,
            call: result
        })
    } catch (err) {
        if (err.message === 'CALL_NOT_FOUND') {
            err.message = 'Call information not found'
            customResponse(404, err, res)
        } else {
            customResponse(400, err, res)
        }
    }
}

async function listCalls (req, res, next) {
    try {
        const result = await CallController.getListOfCalls(req.query)
        res.status(200).json({
            data: result,
            success: true
        })
    } catch (err) {
        if (err.message === 'CALL_NOT_FOUND') {
            err.message = 'Call information not found'
            customResponse(404, err, res)
        } else {
            customResponse(400, err, res)
        }
    }
}

async function listDuplicates (req, res, next) {
    try {
        const result = await CallController.getListOfCallDuplicates(req.query)
        res.status(200).json({
            data: result,
            success: true
        })
    } catch (err) {
        if (err.message === 'DUPLICATE_NOT_FOUND') {
            err.message = 'Duplicate calls not found'
            customResponse(404, err, res)
        } else {
            customResponse(400, err, res)
        }
    }
}

// GET /export API - Exports based on filter or onePortalIds
async function exportDuplicateCallsHandler (req, res, next) {
    try {
        let data = await CallController.getListOfCallDuplicates(req.query)
        if (data.list.length) {
            let exportRes = data.list.map((e, key) => {
                return {
                    'CALL ID': e.callId,
                    'CREATION DATE': moment(e.createdAt).tz(req.query.timezone).format('MM/DD/YYYY hh:mm'),
                    'ASSIGNED TO': e.assigned ? e.assigned.map(assignedTo => assignedTo.name).join(',') : '',
                    'Call Type': e.reason,
                    'BENEFICIARIES / DECEDENTS / CALLER': e.decedentOrBeneficary ? e.decedentOrBeneficary.map(decedent => getFullNameOfPerson(decedent)).join(',') : getFullNameOfPerson(e.caller),
                    'Potential Duplicate Call': e.duplicateCalls.map(duplicate => duplicate.identifier).join(',')
                }
            })
            const json2csvParser = new Json2csvParser({ excelStrings: true })
            const csv = json2csvParser.parse(exportRes)
            res.attachment('duplicateCalls.csv')
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

async function bulkDeleteCallsHandler (req, res, next) {
    const reqBody = req.body
    reqBody.userId = req.currentUser.id
    try {
        const deleteCallsRes = await CallController.bulkDeleteCalls(reqBody)
        res.status(200).json({
            success: true,
            deleteCallsRes
        })
    } catch (error) {
        res.status(400).json(error)
    }
}

function getContact (e) {
    return [e.contactEmail, e.contactNo].filter(ele => ele).join('\n')
}

// GET /export API - Exports based on filter or onePortalIds
async function exportCallsHandler (req, res, next) {
    try {
        // let data = await listCalls.getCallListRes(req.query)
        let data = await CallController.getListOfCalls(req.query)
        if (data.list.length) {
            let exportRes = data.list.map((e, key) => {
                return {
                    /* Id: e.id, */ // As per bug id CL-615 issue 3
                    'CALL ID': e.callId,
                    // 'CREATION DATE': moment(e.createdAt).local().format('MM/DD/YYYY hh:mm'),
                    'CREATION DATE': moment(e.createdAt).tz(req.query.timezone).format('MM/DD/YYYY hh:mm'),
                    'STATUS': e.status,
                    'REASON FOR CALL': e.reason,
                    'BENEFICIARIES/ DECEDENTS': e.decedents.map(decedent => getFullNameOfPerson(decedent)).join(',') || e.beneficiaries.map(beneficiay => getFullNameOfPerson(beneficiay)).join(','),
                    'CONTACT NAME': e.callerName,
                    'CONTACT DETAILS': getContact(e),
                    'ASSIGNED TO': e.assignedTo.join(',')/* ,
                    IsVerified: e.IsVerified ? 'Yes' : 'No' */
                }
            })
            const json2csvParser = new Json2csvParser({ excelStrings: true })
            const csv = json2csvParser.parse(exportRes)
            res.attachment('calls.csv')
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

async function verifyCall (req, res, next) {
    try {
        // let result = await verifyCallController.verifyCall(req)
        let data = req.body
        data.currentUserId = req.currentUser.id
        let callController = new CallController(req.params.callId)
        let result = await callController.verifyCall(data)
        res.status(201).json({
            success: true,
            data: result
        })
    } catch (error) {
        res.status(404).json({
            success: false,
            error: error.message
        })
    }
}

async function listNotes (req, res, next) {
    try {
        let response = await CallController._getNotes(req.params.callId)
        res.status(200).json({
            data: response,
            success: true
        })
    } catch (err) {
        if (err.message === 'CALL_NOT_FOUND') {
            err.message = 'Call information not found'
            customResponse(404, err, res)
        } else {
            customResponse(400, err, res)
        }
    }
}

async function createNotes (req, res, next) {
    try {
        let data = req.body
        const userId = req.currentUser.id
        const callId = req.params.callId
        let result = await CallController.createNotes(data, callId, userId)
        res.status(201).json({
            success: true,
            notes: result
        })
    } catch (err) {
        if (err.message === 'CALL_NOT_FOUND') {
            err.message = 'Call not found'
            customResponse(404, err, res)
        } else {
            customResponse(400, err, res)
        }
    }
}

module.exports = {
    createOrEditCall,
    getCallInfo,
    listCalls,
    bulkDeleteCallsHandler,
    exportCallsHandler,
    verifyCall,
    listNotes,
    createNotes,
    listDuplicates,
    exportDuplicateCallsHandler
}
