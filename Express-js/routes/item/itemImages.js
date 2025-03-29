const ItemImageUploadController = require('../../controllers/refactorControllers/adminController/itemImageUploadController')
const { sendErrorResponse } = require('../../lib/errorResponse')
const { customResponse } = require('../../lib/custom-response')

exports.uploadImages = async function (req, res) {
    try {
        const instance = new ItemImageUploadController(Number(req.body.itemId), req.body.itemType)
        const result = await instance.createItemImages(req.files, req.currentUser)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

exports.deleteImages = async function (req, res, next) {
    try {
        const instance = new ItemImageUploadController(Number(req.query.itemId), req.query.itemType)
        const result = await instance.deleteItemImage(Number(req.params.imageId), req.currentUser)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

exports.makePrimary = async function (req, res, next) {
    try {
        const instance = new ItemImageUploadController(Number(req.query.itemId), req.query.itemType)
        const result = await instance.makePrimary(Number(req.params.imageId), req.currentUser)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}
