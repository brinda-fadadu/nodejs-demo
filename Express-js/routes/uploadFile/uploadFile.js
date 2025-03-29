const logger = require('../../lib/logger')
const { customResponse } = require('../../lib/custom-response')
const UploadFileController = require('../../controllers/refactorControllers/uploadFileController/uploadFileController')

async function fileUploadHandler (req, res, next) {
    try {
        let uploadFileController = new UploadFileController()
        const url = await uploadFileController.uploadFileWithSignature(req.file, req.body.folder)
        customResponse(201, url, res)
    } catch (error) {
        logger.error(`Error while uploading image ${error}`)
        customResponse(400, error, res)
    }
}

module.exports = exports = {
    fileUploadHandler
}
