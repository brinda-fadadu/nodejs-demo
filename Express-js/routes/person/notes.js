const PersonController = require('../../controllers/refactorControllers/personController/personController')
const { customResponse } = require('../../lib/custom-response')
const { sendErrorResponse } = require('../../lib/errorResponse')

async function getNotesHandler (req, res, next) {
    try {
        const personId = req.params.personId
        const personController = new PersonController(personId)
        const notes = await personController.getPersonRelatedNotes()
        customResponse(200, notes, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
module.exports = exports = getNotesHandler
