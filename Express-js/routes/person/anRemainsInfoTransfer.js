const { createAnremainsInfoTransfer } = require('../../controllers/persons/caseOverview/anRemains/createAnRemainsInfoTransfer')
const getAllRemainsTransfers = require('../../controllers/persons/caseOverview/anRemains/getAllRemainsTransfers')
const getAnRemainsTransferInfo = require('../../controllers/persons/caseOverview/anRemains/getAllRemainsTransferInfo')
const updateAnRemainsTransferInfo = require('../../controllers/persons/caseOverview/anRemains/updateAnRemainsTransferInfo')
const deleteAnRemainsInfoTransferInfo = require('../../controllers/persons/caseOverview/anRemains/deleteAnRemainsInfoTransferInfo')
const sendResponse = require('../../lib/custom-response')

exports.createAnremainsInfoTransfer = async (req, res, next) => {
    const personId = req.params.personId
    try {
        const anRemains = await createAnremainsInfoTransfer(personId, req.body, req.currentUser.id)
        sendResponse(201, anRemains, res)
    } catch (error) {
        next(error)
        sendResponse(404, error, res)
    }
}

exports.getAnRemainsInfoTransfers = async (req, res, next) => {
    try {
        const personId = req.params.personId
        // let matchCriteria = {}
        // matchCriteria = { AnRemainsId: Number(personId), DeletedAt: null, DeletedBy: null }
        // matchCriteria = { DeletedAt: null, DeletedBy: null }

        const queryObj = req.query
        const sortOrder = queryObj.sortOrder ? queryObj.sortOrder : 'desc'
        const result = await getAllRemainsTransfers(personId, sortOrder)
        sendResponse(200, result, res)
    } catch (err) {
        sendResponse(404, err, res)
    }
}

exports.getAnRemainsInfoTransferInfo = async (req, res) => {
    try {
        let matchCriteria = { AnRemainsId: req.params.anRemainsInfoId, Identifier: req.params.transferId }
        const result = await getAnRemainsTransferInfo(matchCriteria)
        sendResponse(200, result, res)
    } catch (err) {
        sendResponse(400, err, res)
    }
}

exports.updateAnRemainsInfoHandler = async (req, res) => {
    try {
        const result = await updateAnRemainsTransferInfo.updateAnRemainsTransferInfo(req.params.personId, req.params.transferId, req.currentUser.id, req.body)
        sendResponse(200, result, res)
    } catch (err) {
        sendResponse(400, err, res)
    }
}

exports.deleteAnRemainsInfoTransferInfo = async (req, res) => {
    try {
        const result = await deleteAnRemainsInfoTransferInfo(req.params.personId, req.params.transferId, req.currentUser.id)
        sendResponse(200, result, res)
    } catch (err) {
        sendResponse(400, err, res)
    }
}
