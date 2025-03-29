const { customResponse } = require('../../lib/custom-response')
const ObituaryController = require('../../controllers/refactorControllers/personController/obituaryController')

async function getObituaryDetails (req, res, next) {
    try {
        const data = await ObituaryController.getObituaryDetails(req.params.personId)
        customResponse(200, data, res)
    } catch (error) {
        customResponse(404, error, res)
    }
}

async function createObituary (req, res, next) {
    try {
        req.body.personId = req.params.personId
        req.body.createdBy = req.currentUser.id
        const data = await ObituaryController.createObituary(req.body)
        customResponse(201, data, res)
    } catch (error) {
        customResponse(400, error, res)
    }
}

async function createObituaryFile (req, res, next) {
    try {
        req.body.personId = req.params.personId
        req.body.createdBy = req.currentUser.id
        const data = await ObituaryController.createObituaryFile(req.body)
        customResponse(201, data, res)
    } catch (error) {
        customResponse(400, error, res)
    }
}

async function uploadPersonPicture (req, res, next) {
    try {
        const data = await ObituaryController.uploadPersonPicture(req.params.personId, req.body, req.currentUser.id)
        customResponse(200, data, res)
    } catch (error) {
        customResponse(400, error, res)
    }
}

async function downloadObituaryPDF (req, res, next) {
    try {
        const data = await ObituaryController.downloadObituaryPDF(req.params.personId, req.query.timezone)
        data.pipe(res)
    } catch (error) {
        customResponse(404, error, res)
    }
}

module.exports = exports = {
    getObituaryDetails,
    createObituary,
    createObituaryFile,
    uploadPersonPicture,
    downloadObituaryPDF
}
