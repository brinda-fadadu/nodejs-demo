const models = require('../../../models')
// const _ = require('lodash')

class ResourceDocumentsController {
    /**
     * This method is used to create the documents for the respective resource
     * @param {Number} resourceId id of the resource to which the documents need to be added
     * @param {String} resourceType it is the name of the model(resource) for which the documents need to be created
     * @param {Array} documentUrls it is array of the document urls
     * @param {*} transaction
     */
    static async createOrEditDocuments (resourceId, resourceType, documentUrls, transaction) {
        await models.ResourceDocuments.destroy({
            where: {
                resourceId,
                resourceType
            }
        })

        await models.File.destroy({
            where: {
                resourceId,
                resourceName: 'ResourceDocuments'
            }
        })
        if (documentUrls.length) {
            // const payload = documentUrls.map(document => {
            //     return {
            //         // imageUrl: _.get(document, 'imageUrl', document),
            //         resourceId,
            //         resourceType
            //     }
            // })
            await Promise.all(
                documentUrls.map(async eachRecord => {
                    const resourceDocumentResult = await models.ResourceDocuments.create({
                        // imageUrl: _.get(eachRecord, 'imageUrl', eachRecord),
                        resourceId,
                        resourceType
                    }, { transaction })
                    await models.File.create({
                        resourceId: resourceDocumentResult.id,
                        resourceName: 'ResourceDocuments',
                        folderName: eachRecord.folderName,
                        originalFileName: eachRecord.originalFileName
                    }, { transaction })
                })
            )
        }
    }
}

module.exports = ResourceDocumentsController
