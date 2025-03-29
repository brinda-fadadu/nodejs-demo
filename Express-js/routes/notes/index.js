const router = require('express').Router()
const authentication = require('../../middleware/authentication')
const notesHandler = require('./notesHandler')
const { getNotesValidation, postNoteValidation } = require('../../lib/validations/notes')
const roleBasedAccess = require('../../middleware/roleAuth')
const { notesAuth } = require('../../middleware/notesAuth')
router.use(authentication)
router.use(notesAuth, roleBasedAccess())
router.get('/', getNotesValidation, notesHandler.getNotes)
router.post('/', postNoteValidation, notesHandler.createNote)

module.exports = router
