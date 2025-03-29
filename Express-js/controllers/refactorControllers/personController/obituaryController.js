const models = require('../../../models')
const moment = require('moment')
const _ = require('lodash')
const { upsert, commonDownloadFileWithSignature, getFullNameOfPerson } = require('../utils')
const UploadFileController = require('../uploadFileController/uploadFileController')
let uploadFileController = new UploadFileController()
const makeHTML = require('../../../utils/generatePDF/dataHTML')
const wkhtmltopdf = require('wkhtmltopdf')
const path = require('path')

class ObituaryController {
    /**
     * This is to save Obituary details of a Person
     * @param {*} obituaryData is the data to create
     */
    static async createObituary (obituaryData) {
        let obituary = await models.Obituary.create(obituaryData)
        const obituaryDetails = await ObituaryController.getObituaryDetails(obituary.personId)
        return obituaryDetails
    }

    /**
     * This is used to save the Obituary File details of a Person
     * @param {*} obituaryFileData is the uploaded audio file data
     */
    static async createObituaryFile (obituaryFileData) {
        const obituaryFile = await models.ObituaryFile.create(obituaryFileData)
        if (obituaryFileData.saveFileUrl && obituaryFileData.saveFileUrl.folderName && obituaryFileData.saveFileUrl.originalFileName) {
            await upsert('File', {
                resourceId: obituaryFile.id,
                resourceName: 'ObituaryFile',
                folderName: obituaryFileData.saveFileUrl.folderName,
                originalFileName: obituaryFileData.saveFileUrl.originalFileName })
        }
        const obituaryDetails = await ObituaryController.getObituaryDetails(obituaryFile.personId)
        return obituaryDetails
    }

    /**
     * This is used to update picture of a Person
     * @param {*} personId is id of a Person
     * @param {*} pictureUrl is the uploaded image url of a Person
     * @param {*} userId is the id of a current User logged in application
     */
    static async uploadPersonPicture (personId, body, userId) {
        try {
            await models.sequelize.transaction(async (t) => {
                if (body.savePictureUrl) {
                    await upsert('File', {
                        resourceId: personId,
                        resourceName: 'Person',
                        folderName: body.savePictureUrl.folderName,
                        originalFileName: body.savePictureUrl.originalFileName }, t, { userId: userId })
                } else {
                    await models.File.destroy({
                        where: {
                            resourceId: personId,
                            resourceName: 'Person'
                        }
                    })
                    await upsert('Person', { id: personId, pictureUrl: body.pictureUrl }, t, { userId: userId })
                }
            })
            const obituaryDetails = await ObituaryController.getObituaryDetails(personId)
            const person = await models.Person.findOne({
                where: {
                    id: this.personId
                },
                attributes: ['isAlive']
            })
            if (!person.isAlive) {
                const { queueNames, queues } = require('../../../appQueues')
                const webCemQueue = queues[queueNames.webCemQueue]
                const dataToSend = {
                    event: 'decedent.save',
                    payload: {
                        personId: personId,
                        userId: userId,
                        triggerPoint: 'CaseInfo'
                    }
                }
                webCemQueue.add('webCemQueue', dataToSend)
            }
            return obituaryDetails
        } catch (error) {
            console.log(error)
        }
    }

    /**
     * This is used to get the last updated Obituary details of a Person
     * @param {*} personId is id of a Person
     */
    static async getObituaryDetails (personId) {
        let obituary = await models.Person.findByPk(personId, {
            attributes: ['id', 'prefix', 'firstName', 'middleName', 'lastName', 'dateOfBirth', 'pictureUrl'],
            include: [
                {
                    model: models.Obituary,
                    as: 'obituaryDetails',
                    attributes: ['obituary', 'obituaryBy', 'createdBy', 'createdAt'],
                    include: [
                        {
                            model: models.User,
                            attributes: ['name']
                        }
                    ],
                    order: [
                        ['createdAt', 'DESC']
                    ],
                    limit: 1
                },
                {
                    model: models.ObituaryFile,
                    as: 'obituaryFileDetails',
                    attributes: ['fileUrl', 'createdBy', 'createdAt'],
                    include: [
                        {
                            model: models.User,
                            attributes: ['name']
                        }, {
                            model: models.File,
                            as: 'obituaryFileAudioUrl',
                            where: { resourceName: 'ObituaryFile' },
                            required: false
                        }
                    ],
                    order: [
                        ['createdAt', 'DESC']
                    ],
                    limit: 1
                },
                {
                    model: models.DeathDetails,
                    as: 'deathDetails',
                    attributes: ['dateOfDeath']
                },
                {
                    model: models.File,
                    as: 'personPictureUrl',
                    where: { resourceName: 'Person' },
                    required: false
                }
            ]
        })
        if (obituary) {
            let result = obituary.toJSON()
            let singedPictureUrl
            if ((result.personPictureUrl && result.personPictureUrl.originalFileName) || result.pictureUrl) {
                singedPictureUrl = await commonDownloadFileWithSignature(result.personPictureUrl, result.pictureUrl)
                result.pictureUrl = singedPictureUrl
                delete result.personPictureUrl
            }
            result.dateOfDeath = result.deathDetails ? result.deathDetails.dateOfDeath : null
            let [obituaryDetails] = obituary.obituaryDetails
            let [obituaryFileDetails] = obituary.obituaryFileDetails
            result.audioFileUrl = ''
            if ((obituaryFileDetails && obituaryFileDetails.obituaryFileAudioUrl && obituaryFileDetails.obituaryFileAudioUrl.originalFileName) || (obituaryFileDetails && obituaryFileDetails.fileUrl)) {
                let audioUrl = (obituaryFileDetails && obituaryFileDetails.obituaryFileAudioUrl && obituaryFileDetails.obituaryFileAudioUrl.originalFileName) ? obituaryFileDetails.obituaryFileAudioUrl.originalFileName : null
                let oldAudioUrl = (obituaryFileDetails && obituaryFileDetails.fileUrl) ? obituaryFileDetails.fileUrl : null
                let audioFileUrl = await uploadFileController.downloadFileWithSignature(audioUrl, oldAudioUrl)
                result.audioFileUrl = audioFileUrl
                delete result.obituaryFileAudioUrl
            }
            // result.audioFileUrl = obituaryFileDetails ? obituaryFileDetails.fileUrl : null
            result.obituary = obituaryDetails ? obituaryDetails.obituary : null
            result.obituaryBy = _.get(obituaryDetails, 'obituaryBy', '')
            if (obituaryDetails && obituaryFileDetails) {
                let obituaryCreatedAt = moment(obituaryDetails.createdAt)
                let obituaryFileCreatedAt = moment(obituaryFileDetails.createdAt)
                result.lastUpdatedAt = obituaryFileCreatedAt > obituaryCreatedAt
                    ? obituaryFileDetails.createdAt : obituaryDetails.createdAt
                result.lastUpdatedBy = obituaryFileCreatedAt > obituaryCreatedAt
                    ? _.get(obituaryFileDetails, 'User.name', null) : _.get(obituaryDetails, 'User.name', null)
            } else {
                result.lastUpdatedAt = obituaryFileDetails
                    ? obituaryFileDetails.createdAt : obituaryDetails
                        ? obituaryDetails.createdAt : null
                result.lastUpdatedBy = _.get(obituaryFileDetails, 'User.name') || _.get(obituaryDetails, 'User.name', null)
            }
            delete result.deathDetails
            delete result.obituaryDetails
            delete result.obituaryFileDetails
            return result
        } else {
            throw new Error('OnePortalId not found')
        }
    }

    /**
     * This is used to download obituary PDF file of a Person
     * @param {*} personId is id of a Person
     */
    static async downloadObituaryPDF (personId, timezone) {
        try {
            const obituaryDetails = await ObituaryController.getObituaryDetails(personId)
            const decedentFullName = getFullNameOfPerson(obituaryDetails)
            let obituaryRes = { ...obituaryDetails, decedentFullName: decedentFullName }
            obituaryRes.dateOfBirth = obituaryRes.dateOfBirth ? moment(obituaryRes.dateOfBirth).tz(timezone).format('MM/DD/YYYY') : ''
            obituaryRes.dateOfDeath = obituaryRes.dateOfDeath ? moment(obituaryRes.dateOfDeath).tz(timezone).format('MM/DD/YYYY') : ''

            let htmlTemplate = path.resolve(__dirname, `../../../utils/generatePDF/htmlTemplates/obituaryPdfTemplate.html`)
            let renderedHtml = await makeHTML(htmlTemplate, obituaryRes)

            let pdfStream = wkhtmltopdf(renderedHtml, { pageSize: 'A4' })
            return pdfStream
        } catch (error) {
            throw error
        }
    }
}
module.exports = ObituaryController
