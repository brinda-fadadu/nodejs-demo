const itemController = require('../../controllers/refactorControllers/itemController/itemController')
const { sendErrorResponse } = require('../../lib/errorResponse')
const ItemImageUploadController = require('../../controllers/refactorControllers/adminController/itemImageUploadController')
async function getItemsListByFilters (req, res, next) {
    try {
        const query = {
            ...req.query,
            ...req.params
        }
        if (!query.offset) {
            query.offset = 0
        }
        if (!query.limit) {
            query.limit = 10
        }
        const result = await itemController.getItemsByFilter(query)
        res.status(200).send({
            ...result
        })
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function getItemsListForImageUpload (req, res, next) {
    try {
        const query = {
            ...req.query,
            ...req.params
        }
        if (!query.offset) {
            query.offset = 0
        }
        if (!query.limit) {
            query.limit = 10
        }
        const result = await ItemImageUploadController.getListOfItems(query)
        res.status(200).send({
            ...result
        })
    } catch (err) {
        sendErrorResponse(err, res)
    }
}
module.exports = {
    getItemsListByFilters,
    getItemsListForImageUpload
}
