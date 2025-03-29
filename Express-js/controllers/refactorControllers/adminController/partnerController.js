const models = require('../../../models')
const logger = require('../../../lib/logger')
const AddressController = require('../addressController/addressController')
const PersonController = require('../personController/personController')
const UploadFileController = require('../uploadFileController/uploadFileController')
const { upsert, commonDownloadFileWithSignature } = require('../utils')
let uploadFileController = new UploadFileController()

class PartnerController {
    constructor (partnerId) {
        this.partnerId = partnerId
    }

    static get discountTypes () {
        return {
            1: 'Percentage %',
            2: 'Dollar amount $'
        }
    }

    /**
     * @returns {Object} return object of the partner created
     * @param {Object} params
     * @param {string} params.partnerName
     * @param {number} params.discountType
     * @param {number} params.discountAmount
     * @param {boolean} params.isActive
     * @param {Object} params.contact
     * @param {Object} params.addressPlace
     */
    static async createOrUpdatePartner (params, user, file, partnerId) {
        let transaction
        try {
            let documentUrlObj
            // let documentUrl
            transaction = await models.sequelize.transaction()

            if (file) {
                documentUrlObj = await uploadFileController.uploadFileWithSignature(file, 'partnerImages')
            }
            // else {
            //     throw new Error('ATTACHMENT NOT FOUND')
            // }
            // else if (partnerId) {
            //     documentUrl = params.documentUrl
            // }

            let contact = await PersonController.createOrUpdate(params.contact, {}, {}, transaction)
            let addressPlace = await AddressController.managePlace(params.addressPlace, transaction)
            let partnerObj = {
                partnerName: params.partnerName,
                discountType: Number(params.discountType),
                discountValue: params.discountValue,
                isActive: params.isActive,
                contactId: contact.id,
                addressPlaceId: addressPlace.id,
                // documentUrl,
                createdBy: user.id,
                updatedBy: user.id
            }

            if (partnerId) {
                partnerObj = { ...partnerObj, id: partnerId }
            }

            let partner = await upsert('Partners', partnerObj, transaction, { userId: user.id })
            let partnerFile = await models.File.findOne({
                where: {
                    resourceId: partner.id || partnerId,
                    resourceName: 'Partners'
                }
            })
            if (documentUrlObj) {
                await upsert('File', {
                    id: partnerFile ? partnerFile.id : null,
                    resourceId: partner.id || partnerId,
                    resourceName: 'Partners',
                    folderName: documentUrlObj.folderName,
                    originalFileName: documentUrlObj.originalFileName }, transaction)
            }
            await transaction.commit()

            let partnerToSend = await models.Partners.scope('defaultIncludes').findOne({
                where: {
                    id: partner.id || partnerId
                }
            })

            return partnerToSend
        } catch (err) {
            await transaction.rollback()
            logger.log('error', err.message)
            throw err
        }
    }

    /**
     * @returns {Object} return object with totalReslts and count of the results
     * @param {Object} reqQuery
     * @param {number} reqQuery.limit number of record to be sent in the response
     * @param {number} reqQuery.page is the page you want to show the results in
     * @param {Boolean} reqQuery.listAll is the boolean which is used to check if data needs to be sent with/without pagination
     */
    static async getListOfPartners (reqQuery) {
        try {
            const { limit, page, listAll, isActive } = reqQuery
            let filterQuery = {}
            if (!listAll) {
                filterQuery.limit = limit ? Number(limit) : 10
                filterQuery.offset = page ? (Number(page) - 1) * Number(limit) : 0
            }
            if (isActive !== undefined) {
                filterQuery.where = {
                    isActive: isActive === 'true'
                }
            }
            const result = await models.Partners.scope('defaultIncludes').findAndCountAll({
                ...filterQuery
            })
            if (result && result.rows) {
                result.rows = await Promise.all(result.rows.map(async row => {
                    row = row.toJSON()
                    if ((row.partnerDocumentUrl && row.partnerDocumentUrl.originalFileName) || row.documentUrl) {
                        row.documentUrl = await commonDownloadFileWithSignature(row.partnerDocumentUrl, row.documentUrl)
                        return row
                    } else return row
                })
                )
            }
            return {
                list: result.rows.length ? result.rows.map(row => {
                    return {
                        ...row,
                        discountTypeValue: this.discountTypes[row.discountType]
                    }
                }) : [],
                count: result.count
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    getPartnerDetails (transaction) {
        return models.Partners.findOne({
            where: {
                id: this.partnerId
            },
            transaction
        })
    }

    updatePartner (partner, transaction) {
        return models.Partners.update(partner.dataValues, {
            where: {
                id: this.partnerId
            },
            transaction
        })
    }
}
module.exports = PartnerController
