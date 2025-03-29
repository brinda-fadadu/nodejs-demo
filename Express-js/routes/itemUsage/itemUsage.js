const { customResponse } = require('../../lib/custom-response')
const { sendErrorResponse } = require('../../lib/errorResponse')
const logger = require('../../lib/logger')
const Controller = require('../../controllers/refactorControllers/itemUsageController/itemUsageController')

async function getItemUsageSummary (req, res) {
    try {
        const itemUsage = new Controller(req.params.personId)
        const result = await itemUsage.getItemUsageSummary()
        customResponse(200, result, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

async function getAvailableItemsForItemUsage (req, res) {
    try {
        const itemUsage = new Controller(req.params.personId)
        const result = await itemUsage.getAvailableItemsForItemUsage(req.query)
        customResponse(200, result, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

async function createAndUpdateItemUsage (req, res) {
    try {
        let result
        const itemUsage = new Controller(req.params.personId)
        if (!req.body.isDeleted) {
            req.body.createdBy = req.currentUser.id
            result = await itemUsage.createItemUsageSelect(req.body, req.currentUser.id)
        } else {
            result = await itemUsage.updateItemUsageUnselect(req.body.itemUsageId, req.body.timezone, req.currentUser.id)
        }
        customResponse(200, result, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

async function updateItemUsageConfirm (req, res) {
    try {
        const itemUsage = new Controller(req.params.personId)
        const result = await itemUsage.updateItemUsageConfirm(req.body.itemUsageIds, req.currentUser.id)
        customResponse(200, result, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

async function getSelectedMerchandiseItems (req, res) {
    try {
        const itemUsage = new Controller(req.params.personId)
        const result = await itemUsage.getSelectedMerchandiseItems(req.query.itemType)
        customResponse(200, result, res)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

module.exports = {
    getItemUsageSummary,
    getAvailableItemsForItemUsage,
    updateItemUsageConfirm,
    createAndUpdateItemUsage,
    getSelectedMerchandiseItems
}
