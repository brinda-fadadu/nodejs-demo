const NotesController = require('../../controllers/refactorControllers/notesController/notesController')
const { customResponse } = require('../../lib/custom-response')

async function createNote (req, res, next) {
    try {
        let data = req.body
        data.userId = req.currentUser.id
        let result = await NotesController.createNote(data)
        res.status(201).json({
            success: true,
            notes: result
        })
    } catch (err) {
        if (err.message === 'RESOURCE_NOT_FOUND') {
            err.message = 'Resource not found'
            customResponse(404, err, res)
        } else {
            customResponse(400, err, res)
        }
    }
}

async function getNotes (req, res, next) {
    try {
        let response = await NotesController.getNotes(req.query.resourceId, req.query.resourceType)
        res.status(200).json({
            data: response,
            success: true
        })
    } catch (err) {
        if (err.message === 'RESOURCE_NOT_FOUND') {
            err.message = 'Resource not found'
            customResponse(404, err, res)
        } else {
            customResponse(400, err, res)
        }
    }
}

module.exports = {
    createNote,
    getNotes
}
