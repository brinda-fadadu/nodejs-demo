const createNoteController = require('../../controllers/calls/note/create')
const models = require('../../models/index')

async function createNoteHandler (req, res, next) {
    let t = await models.sequelize.transaction()
    try {
        let data = req.body
        data.userId = req.currentUser.id
        data.callId = req.params.callId
        let result = await createNoteController.createNote(data, t)
        await t.commit()
        res.status(201).json({
            success: true,
            note: result
        })
    } catch (error) {
        await t.rollback()
        next(error)
    }
}

module.exports = createNoteHandler
