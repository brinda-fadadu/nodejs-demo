const moment = require('moment')
const _ = require('lodash')
const logger = require('../../../lib/logger')
const models = require('../../../models')
const { upsert } = require('../utils')

class ObituaryController {
    constructor (opi) {
        this.opi = opi
    }

    async getObituaryDecedent () {
        return models.Person.scope('withObituaryDetails').findOne({
            attributes: ['id', 'prefix', 'firstName', 'middleName', 'lastName', 'dateOfBirth', 'pictureUrl'],
            include: [{
                model: models.PersonVerificationDetails,
                as: 'personVerificationDetails',
                attributes: ['onePortalId'],
                where: {
                    onePortalId: this.opi
                }
            }]
        })
    }

    async getObituary () {
        let obituary = await this.getObituaryDecedent()
        if (obituary) {
            let result = obituary.toJSON()
            result.dateOfDeath = result.deathDetails ? result.deathDetails.dateOfDeath : null
            let [obituaryDetails] = obituary.obituaryDetails
            let [obituaryFileDetails] = obituary.obituaryFileDetails
            result.audioFileUrl = obituaryFileDetails ? obituaryFileDetails.fileUrl : null
            result.obituary = obituaryDetails ? obituaryDetails.obituary : null
            result.saveFileUrl = obituaryFileDetails && obituaryFileDetails.obituaryFileAudioUrl ? obituaryFileDetails.obituaryFileAudioUrl : null
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
            throw new Error('OBITUARY_NOT_FOUND')
        }
    }

    async saveOrEditObituary (reqBody, userId) {
        let trx = await models.sequelize.transaction()
        try {
            let decedentObituary = await this.getObituaryDecedent()
            let { obituary, pictureUrl, audioFileUrl, obituaryBy, savePictureUrl, saveFileUrl } = reqBody
            let obituaryId = _.get(decedentObituary, 'obituaryDetails') && _.get(decedentObituary.obituaryDetails[0], 'id')
            let personId = _.get(decedentObituary, 'obituaryDetails') && _.get(decedentObituary.obituaryDetails[0], 'personId')
            if (!personId) {
                let person = await models.Person.findOne({
                    attributes: ['id', 'prefix', 'firstName', 'middleName', 'lastName', 'dateOfBirth', 'pictureUrl'],
                    include: [{
                        model: models.PersonVerificationDetails,
                        as: 'personVerificationDetails',
                        attributes: ['onePortalId'],
                        where: {
                            onePortalId: this.opi
                        }
                    }]
                })
                personId = person.id
            }
            let existingAudioFile = _.get(decedentObituary, 'obituaryFileDetails') && _.get(decedentObituary.obituaryFileDetails[0], 'fileUrl')
            if (pictureUrl !== _.get(decedentObituary, 'pictureUrl')) {
              if (savePictureUrl) {
                await upsert('File', {
                    resourceId: personId,
                    resourceName: 'Person',
                    folderName: savePictureUrl.folderName,
                    originalFileName: savePictureUrl.originalFileName }, trx, { userId: userId })
              } else {
                  await models.File.destroy({
                      where: {
                          resourceId: personId,
                          resourceName: 'Person'
                      }
                  })
                  await upsert('Person', { id: decedentObituary.id, pictureUrl: pictureUrl }, trx, { userId: userId })
              }
              // await upsert('Person', { id: decedentObituary.id, pictureUrl: pictureUrl }, trx, { userId: userId })
            }
            if (obituaryId) {
                let existingObituary = _.get(decedentObituary, 'obituaryDetails') && _.get(decedentObituary.obituaryDetails[0], 'obituary')
                if (existingObituary !== obituary) {
                    await models.Obituary.update({
                        createdAt: new Date(),
                        createdBy: null,
                        obituaryBy,
                        obituary
                    }, {
                        where: {
                            id: obituaryId
                        },
                        transaction: trx
                    })
                }
                if (existingAudioFile) {
                    if (audioFileUrl !== existingAudioFile) {
                      if (saveFileUrl) {
                        await upsert('File', {
                          resourceId: obituaryId,
                          resourceName: 'ObituaryFile',
                          folderName: saveFileUrl.folderName,
                          originalFileName: saveFileUrl.originalFileName }, trx, { userId: userId })
                      } else {
                        await models.ObituaryFile.update({
                          fileUrl: audioFileUrl,
                          fileType: 'audio',
                            createdBy: null
                        }, {
                            where: {
                                personId
                            },
                            transaction: trx
                        })
                      }
                    }
                } else {
                    let obituaryFile = await models.ObituaryFile.create({
                        fileUrl: audioFileUrl,
                        fileType: 'audio',
                        personId
                    }, {
                        where: {
                            personId
                        },
                        transaction: trx
                    })
                    if (saveFileUrl) {
                      await upsert('File', {
                        resourceId: obituaryFile.id,
                        resourceName: 'ObituaryFile',
                        folderName: saveFileUrl.folderName,
                        originalFileName: saveFileUrl.originalFileName }, trx, { userId: userId })
                    }
                }
            } else {
                if (obituary) {
                    await models.Obituary.create({
                        obituary,
                        obituaryBy,
                        personId
                    }, { transaction: trx })
                }
                if (audioFileUrl && audioFileUrl !== existingAudioFile) {
                    let obituaryFile = await models.ObituaryFile.create({
                        fileUrl: audioFileUrl,
                        fileType: 'audio',
                        personId
                    }, { transaction: trx })
                    if (saveFileUrl) {
                      await upsert('File', {
                        resourceId: obituaryFile.id,
                        resourceName: 'ObituaryFile',
                        folderName: saveFileUrl.folderName,
                        originalFileName: saveFileUrl.originalFileName }, trx, { userId: userId })
                    }
                }
            }
            trx.commit()
            return decedentObituary
        } catch (err) {
            logger.error(err)
            await trx.rollback()
            throw err
        }
    }

    static async getOnePortalId (decedentId) {
        try {
            let person = await models.PersonVerificationDetails.findOne({
                attributes: ['onePortalId'],
                where: {
                    personId: decedentId
                }
            })
            return _.get(person, 'onePortalId', null)
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    static async setObituaryLock (lockStatus, personId) {
        try {
            let update = await models.FamilyArranger.update({
                isObituaryLocked: lockStatus
            }, {
                where: {
                    decedentId: personId
                }
            })
            if (update[0]) return true
            else return false
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    static async getObituaryLockStatus (personId) {
        try {
            let status = await models.FamilyArranger.findOne({
                attributes: ['isObituaryLocked'],
                where: {
                    decedentId: personId
                }
            })
            return status
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
}

module.exports = ObituaryController
