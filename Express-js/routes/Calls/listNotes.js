const listNoteController = require('../../controllers/calls/note/listNotes')
const models = require('../../models/index')

async function listOfNotes (req, res, next) {
    let t = await models.sequelize.transaction()
    try {
        let data = req.query
        data.callId = req.params.callId
        let result = await listNoteController.listOfNotes(data, t)
        await t.commit()
        res.status(201).json({
            success: true,
            notes: result
        })
    } catch (error) {
        await t.rollback()
        next(error)
    }
}
module.exports = listOfNotes
