const CheckRequestController = require('../../controllers/refactorControllers/checkRequestController/checkRequestController')
const { customResponse } = require('../../lib/custom-response')
const logger = require('../../lib/logger')
async function getCAChecksLists (req, res) {
    try {
        let result = []
        const checkRequestController = new CheckRequestController()
        result = await checkRequestController.getCAChecksLists(req.query)
        customResponse(200, result, res)
    } catch (err) {
        logger.log('error', err)
        customResponse(400, err, res)
    }
}

async function UpdateCACheckRequest (req, res) {
    try {
        let result
        const checkRequestController = new CheckRequestController()
        result = await checkRequestController.UpdateCACheckRequest(req.body)
        customResponse(200, result, res)
    } catch (err) {
        logger.log('error', err)
        customResponse(400, err, res)
    }
}

async function addCAVendor (req, res) {
    try {
        let result
        const checkRequestController = new CheckRequestController()
        result = await checkRequestController.addCAVendor(req.body)
        customResponse(200, result, res)
    } catch (err) {
        logger.log('error', err)
        customResponse(400, err, res)
    }
}
async function getCAVendors (req, res) {
    try {
        let result
        const checkRequestController = new CheckRequestController()
        result = await checkRequestController.getCAVendors(req.query)
        customResponse(200, result, res)
    } catch (err) {
        logger.log('error', err)
        customResponse(400, err, res)
    }
}

module.exports = {
    getCAChecksLists,
    UpdateCACheckRequest,
    addCAVendor,
    getCAVendors
}
