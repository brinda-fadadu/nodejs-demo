const logger = require('../../../lib/logger')
const { upsert } = require('../utils')
const models = require('../../../models')

class SchedulingFileSectionController {
    async upsertSchedulingFileSection (data, transaction) {
        try {
            // delete data.fileUrl
            const schedulingFileResult = await upsert('SchedulingFile', data, transaction)
            if (data.fileUrl !== null) {
                await upsert('File', {
                    resourceId: schedulingFileResult.id,
                    resourceName: 'SchedulingFile',
                    folderName: data.folderName,
                    originalFileName: data.originalFileName }, transaction)
            } else if (data.fileUrl === null && data.id) {
                await models.File.destroy({
                    where: {
                        resourceId: data.id,
                        resourceName: 'SchedulingFile'
                    }
                })
            }
            return true
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
}
module.exports = exports = SchedulingFileSectionController
