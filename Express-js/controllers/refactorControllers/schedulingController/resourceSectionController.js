const logger = require('../../../lib/logger')
const models = require('../../../models')
const { upsert } = require('../utils')
const _ = require('underscore')

class ResourceSectionController {
    async _createNoteForResourceSection (notesArray, resourceSectionId, userId, levelName, transaction) {
        const noteCategory = await models.NoteCategory.findOne({ where: { name: 'Funeral Scheduling Resource Section' } })
        await Promise.all(
            notesArray.map(async note => {
                if (!note.id) {
                    const inputObj = {
                        resourceType: 'ResourceSection',
                        resourceId: resourceSectionId,
                        content: note.content,
                        categoryId: noteCategory ? noteCategory.id : 6,
                        createdBy: userId,
                        updatedBy: userId
                    }
                    let noteResult = await models.Note.create(inputObj, { transaction })
                    if (noteResult) {
                        await models.NoteLevel.create({ name: levelName, noteId: noteResult.id }, { transaction })
                    }
                }
            })
        )
    }
    async upsertResourceSection (data, userId, transaction) {
        try {
            const result = await upsert('ResourceSection', data, transaction)
            if (result) {
                if (data.pallbearers) {
                    await models.ResourcePallbearer.destroy({
                        where: {
                            resourcesectionId: result.id
                        }
                    })
                    await Promise.all(
                        data.pallbearers.map(async pallbearer => {
                            await upsert('ResourcePallbearer', {
                                resourcesectionId: result.id,
                                contactId: pallbearer
                            }, transaction)
                        })
                    )
                }
                if (!_.isEmpty(data.notesFromFamily)) {
                    await this._createNoteForResourceSection(data.notesFromFamily, result.id, userId, 'family', transaction)
                }
                if (!_.isEmpty(data.notesFromStaff)) {
                    await this._createNoteForResourceSection(data.notesFromStaff, result.id, userId, 'staff', transaction)
                }
            }
            return result
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
}
module.exports = exports = ResourceSectionController
