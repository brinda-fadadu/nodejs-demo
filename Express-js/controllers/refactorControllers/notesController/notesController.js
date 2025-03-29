const models = require('../../../models')
const logger = require('../../../lib/logger')
class NotesController {
    /**
     * Create note for different resources in the system. In future if Note edit functionality comes in, please use the same function do so.
     * @param {*} data is an object with resourceType, resourceId, content, categoryId, userId, level keys
     * @param {Object<{resourceType: String, resourceId: Number, content: String, categoryId: Number, userId: Number, level: String}>} data
     */
    static async createNote (data, suppliedTransaction) {
        let transaction = suppliedTransaction
        let transactionCreated = false
        try {
            // Check if resource exists with resourceType and resourceId
            if (!transaction) {
                transaction = await models.sequelize.transaction()
                transactionCreated = true
            }
            const {
                resourceType,
                resourceId,
                content,
                categoryId,
                level,
                userId
            } = data

            // Check if resource exists
            let resource = await models[`${resourceType}`].findByPk(resourceId, { transaction })
            if (!resource) {
                throw new Error('RESOURCE_NOT_FOUND')
            }

            let noteObj = {
                content,
                resourceId,
                resourceType,
                categoryId,
                createdBy: userId,
                updatedBy: userId
            }
            let noteResult = await models.Note.create(noteObj, { transaction })

            if (level) {
                // createLevel and assign noteId to the level
                let noteLevelObj = {
                    name: level,
                    noteId: noteResult.id
                }
                await models.NoteLevel.create(noteLevelObj, { transaction })
            }
            let res = await this.getNotes(resourceId, resourceType, transaction)
            if (transactionCreated) await transaction.commit()
            return res
        } catch (error) {
            if (transactionCreated) await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    /**
     * Get all notes based on resourceType and Id
     * @param {Number} resourceId
     * @param {String} resourceType
     */
    static async getNotes (resourceId, resourceType, transaction) {
        // Check if resource exists
        let resource = await models[`${resourceType}`].findByPk(resourceId, { transaction })
        if (!resource) {
            throw new Error('RESOURCE_NOT_FOUND')
        }
        const res = await models.Note.scope('withUpdatedBy', 'withCreatedBy', 'withLevel').findAll({
            where: {
                resourceId,
                resourceType
            },
            order: [
                ['updatedAt', 'DESC']
            ],
            transaction
        })
        return res
    }
}

module.exports = NotesController
