const createNoteController = require('../../controllers/calls/note/quickNote')
const models = require('../../models/index')

async function createQuickNotes (req, res, next) {
    let t = await models.sequelize.transaction()
    try {
        let data = req.body
        data.userId = req.currentUser.id
        data.callId = req.params.callId
        let result = await createNoteController.createQuickNote(data, t)
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
module.exports = createQuickNotes
