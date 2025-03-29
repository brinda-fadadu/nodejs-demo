const AgreementItemPriceController = require('./agreementItemPriceController')
const UploadFileController = require('../uploadFileController/uploadFileController')
const models = require('../../../models')
const { upsert } = require('../utils')
const moment = require('moment')
const { $or, $like } = require('../../../lib/sequelize-operators')
const AddendumController = require('./addendum')
const ChangeLogController = require('./changeLog')
let uploadFileController = new UploadFileController()

class AgreementSpecialOrderRequestController extends AgreementItemPriceController {
    static async __getAgreement (agreementId) {
        let agreement = await models.Agreement.findOne({
            where: {
                id: agreementId
            }
        })
        if (agreement) {
            agreement = agreement.toJSON()
        } else {
            throw new Error('AGREEMENT_NOT_FOUND')
        }
        return agreement
    }

    static async __validateItemCategoryAndAttributes (itemCategoryId, attributeValues) {
        const query = `SELECT DISTINCT av.attributeId FROM ItemCategory ic INNER JOIN ItemCategoryAttributeValue icv ON ic.id = icv.itemCategoryId 
            INNER JOIN AttributeValue av ON av.id=icv.attributeValueId 
            INNER JOIN ItemType it ON ic.itemTypeId=it.id WHERE 
            it.name='Merchandises' AND ic.id=:itemCategoryId AND av.attributeId IN (:attributeIds) `
        const attributeIds = Object.keys(attributeValues)
        const result = await models.sequelize.query(query, {
            type: models.sequelize.QueryTypes.SELECT,
            replacements: {
                itemCategoryId: itemCategoryId,
                attributeIds: attributeIds
            }
        })
        if (result.length !== attributeIds.length) {
            throw new Error('INVALID_CATEGORY_ATTRIBUTES')
        }
        return true
    }

    static async __getVendorById (vendorId) {
        const vendor = await models.Vendor.findByPk(vendorId)
        if (!vendor) {
            throw new Error('VENDOR_NOT_FOUND')
        }
        return vendor.toJSON()
    }
    /**
     * Send a special order request to purchase team.
     * @param {Number} agreementId - The agreement in which we are requesting a special order item.
     * @param {Object} payload - The payload came from the request
     * @param {String} payload.name - The name of the item
     * @param {String} payload.description - The description of the item we are requesting
     * @param {String} payload.code - The code of the item we are requesting. If available
     * @param {Number} payload.quantity - The quantity of the item we are requesting.
     * @param {Objecct} payload.attributes - Attributes along with values
     * @param {Number} payload.itemCategoryId - Category of the item which we are requesting
     * @param {String} payload.vendor - Vendor name of the item. This is optional
     * @param {Number} payload.vendorId - Vendor Id. If you select existing vendor id
     * @param {Number} payload.userId - Logged in user id
     * @returns {Object} specialOrderRequest - The created special order request with all this information.
     */
    static async addSpecialOrderRequest (agreementId, payload) {
        try {
            let inProgressAddendum
            const agreement = await this.__getAgreement(agreementId)
            payload.locationId = agreement.locationId
            payload.agreementId = agreementId
            const addendumController = new AddendumController(agreementId)
            inProgressAddendum = await addendumController.getInProgressAddendum()

            if (!payload.addendumId) {
                payload.addendumId = null
                if (agreement.status === 'Submitted' && (!inProgressAddendum || !payload.addendumId)) {
                    throw new Error('AGREEMENT_ALREADY_COMPLETED')
                }
            } else if (payload.addendumId !== inProgressAddendum.id) {
                throw new Error('ADDENDUM_ALREADY_COMPLETED')
            }
            if (payload.vendor && payload.vendor.id) {
                await this.__getVendorById(payload.vendor.id)
            }
            if (payload.attributes && Object.keys(payload.attributes).length) {
                await this.__validateItemCategoryAndAttributes(payload.itemCategoryId, payload.attributes)
            } else {
                payload.attributes = {}
            }
            payload.status = 'Validation Pending'
            payload.attributes = JSON.stringify(payload.attributes)
            payload.vendor = JSON.stringify(payload.vendor)
            const createdResult = await upsert('ItemRequest', payload, null, { userId: payload.userId })
            await ChangeLogController.recordSpecialOrderAction('add', createdResult.id, 'ItemRequest')
            return createdResult
        } catch (err) {
            throw err
        }
    }
    /**
     * Returns special order requests list of an Agreement
     * @param {Number} agreementId
     * @returns {Object} data
     * @returns {Number} data.count returns total result count
     * @returns  {Object[]} data.specialOrderRequests returns total result
     */
    async getSpecialOrderRequests (agreementId, payload = {}) {
        try {
            let { offset = 0, limit = 10, searchTerm, itemCategoryId } = payload
            offset = Number(offset)
            limit = Number(limit)
            const whereQuery = {
                agreementId,
                status: 'Validation Pending'
            }
            let searchQuery = {}
            if (itemCategoryId) {
                searchQuery.itemCategoryId = itemCategoryId
            }
            if (searchTerm) {
                searchQuery = {
                    [$or]: [{
                        name: { [$like]: `%${searchTerm}%` }
                    },
                    {
                        description: { [$like]: `%${searchTerm}%` }
                    },
                    {
                        code: { [$like]: `%${searchTerm}%` }
                    }]
                }
            }
            let result = await models.ItemRequest.findAndCountAll({ where: {
                ...whereQuery,
                ...searchQuery
            },
            include: [
                {
                    model: models.File,
                    as: 'document',
                    where: { resourceName: 'ItemRequest' },
                    required: false
                }
            ],
            limit,
            offset,
            order: [['updatedAt', 'DESC']]
            })
            let specialOrderItems = await Promise.all(result.rows.map(async ele => {
                let jsonEle = ele.toJSON()
                jsonEle.itemType = 'specialOrderRequests'
                let docOrgFileName = ele.document && ele.document.originalFileName ? ele.document.originalFileName : null
                jsonEle.documentUrl = docOrgFileName || ele.documentUrl ? await uploadFileController.downloadFileWithSignature(docOrgFileName, ele.documentUrl) : null
                delete jsonEle.document
                return jsonEle
            }))
            return {
                total: result.count,
                specialOrderItems
            }
        } catch (err) {
            throw err
        }
    }
    /**
     * Deletes a special order request
     * @param {Number} agreementId
     * @param {Object} payload
     * @param {Number} payload.id id of the special order request
     * @param {Number} payload.userId Logged in user
     */
    static async removeSpecialOrderRequests (agreementId, payload) {
        try {
            let inProgressAddendum
            const agreement = await this.__getAgreement(agreementId)
            const addendumController = new AddendumController(agreementId)
            inProgressAddendum = await addendumController.getInProgressAddendum()

            if (!payload.addendumId) {
                payload.addendumId = null
                if (agreement.status === 'Submitted' && (!inProgressAddendum || !payload.addendumId)) {
                    throw new Error('AGREEMENT_ALREADY_COMPLETED')
                }
            } else if (payload.addendumId !== inProgressAddendum.id) {
                throw new Error('ADDENDUM_ALREADY_COMPLETED')
            }
            const result = await models.ItemRequest.update({
                deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                deletedBy: payload.userId
            }, {
                where: {
                    agreementId: agreementId,
                    id: payload.specialOrderRequestId
                }
            })
            if (result[0] === 0) {
                throw new Error('AGREEMENT_SPEICAL_ORDER_REQUEST_NOT_ASSOCIATED')
            }
            await ChangeLogController.recordSpecialOrderAction('remove', payload.specialOrderRequestId, 'ItemRequest')
            return result
        } catch (err) {
            throw err
        }
    }
    /**
     * Get a special order request information by its id
     * @param {*} specialOrderRequestId
     */
    static async getSpecialOrderRequestById (agreementId, specialOrderRequestId) {
        try {
            await this.__getAgreement(agreementId)
            let result = await models.ItemRequest.findOne({
                where: { id: specialOrderRequestId },
                include: [
                    {
                        model: models.File,
                        as: 'document',
                        where: { resourceName: 'ItemRequest' },
                        required: false
                    }
                ]
            })
            if (result) {
                result = result.toJSON()
                let docOrgFileName = result.document && result.document.originalFileName ? result.document.originalFileName : null
                result.documentUrl = docOrgFileName || result.documentUrl ? await uploadFileController.downloadFileWithSignature(docOrgFileName, result.documentUrl) : null
                delete result.document
                return result
            } else {
                throw new Error('SPECIAL_ORDER_REQUEST_NOT_FOUND')
            }
        } catch (err) {
            throw err
        }
    }
    /** Updates the special order requests
     * @param {Object} payload
     */
    static async updateSpecialOrderRequests (agreementId, payload) {
        try {
            await this.__getAgreement(agreementId)
            if (payload.vendor && payload.vendor.id) {
                await this.__getVendorById(payload.vendor.id)
            } else if (!payload.vendor) {
                payload.vendor = {} // As we are storing stringified json we need to place empty string
            }
            if (payload.attributes && Object.keys(payload.attributes).length) {
                await this.__validateItemCategoryAndAttributes(payload.itemCategoryId, payload.attributes)
            } else {
                payload.attributes = {}
            }
            payload.status = 'Validation Pending'
            payload.vendor = JSON.stringify(payload.vendor)
            payload.attributes = JSON.stringify(payload.attributes)
            const result = await upsert('ItemRequest', payload, null, { userId: payload.userId })
            return result
        } catch (err) {
            throw err
        }
    }
    /**
     * Send Approval Request to the Purchase Order department
     * @param {*} agreementId
     * @param {*} specialOrderRequstId
     */
    static async sendApprovalRequest (agreementId, payload) {
        try {
            await this.__getAgreement(agreementId)
            const data = {
                status: 'Validation Pending',
                id: payload.specialOrderRequstId
            }
            const result = await upsert('ItemRequest', data, null, { userId: payload.userId })
            return result
        } catch (err) {
            throw err
        }
    }

    /**
     * Approval Special Order Request
     * @param {*} agreementId
     * @param {*} specialOrderRequstId
     */
    static async approveSpecialOrderRequests (agreementId, payload, file) {
        const AgreementItemController = require('../agreementController/agreementItemController')
        try {
            let document
            if (file) {
                document = await uploadFileController.uploadFileWithSignature(file, 'specialOrderRequestApprovals')
            } else {
                throw new Error('ATTACHMENT NOT FOUND')
            }

            if (!payload.code) {
                throw new Error('ITEM CODE NOT FOUND')
            }
            let inProgressAddendum
            const agreement = await this.__getAgreement(agreementId)
            const addendumController = new AddendumController(agreementId)
            inProgressAddendum = await addendumController.getInProgressAddendum()

            if (!payload.addendumId) {
                payload.addendumId = null
                if (agreement.status === 'Submitted' && (!inProgressAddendum || !payload.addendumId)) {
                    throw new Error('AGREEMENT_ALREADY_COMPLETED')
                }
            } else if (payload.addendumId !== inProgressAddendum.id) {
                throw new Error('ADDENDUM_ALREADY_COMPLETED')
            }
            const merchandise = await models.Item.findAll({
                attributes: {
                    exclude: ['CreatedAt', 'UpdatedAt']
                },
                where: { code: payload.code },
                include: [
                    {
                        model: models.ItemCategory,
                        attributes: [],
                        where: {
                            itemTypeId: 3
                        }
                    }
                ]
            })
            if (merchandise && !merchandise.length) {
                throw new Error('Item code should belong to Merchandise items only')
            }
            let item = await models.Item.findOne({
                where: {
                    code: payload.code
                }
            })
            if (!item) {
                throw new Error('Item Code DOES NOT EXIST')
            }
            let locationItem = await models.LocationItem.findOne({
                where: {
                    itemId: item.id,
                    locationId: agreement.locationId
                }
            })
            let AgreementLocationItem = await models.AgreementLocationItem.findOne({
                where: {
                    locationItemId: locationItem.id,
                    agreementId
                }
            })

            let itemPayload = {
                locationItemId: locationItem.id,
                'removeAll': false,
                timezone: payload.timezone,
                addendumId: payload.addendumId
            }

            if (AgreementLocationItem) {
                itemPayload.agreementLocationItemId = AgreementLocationItem.id
            }
            if (payload.specialOrderRequestId) {
                const itemRequestData = await models.ItemRequest.findOne({
                    where: {
                        id: payload.specialOrderRequestId,
                        agreementId,
                        deletedAt: null,
                        deletedBy: null
                    }
                })
                itemPayload.quantity = itemRequestData.quantity
            }

            const data = {
                status: 'Approved',
                // documentUrl,
                id: payload.specialOrderRequestId
            }
            const result = await upsert('ItemRequest', data, null, { userId: payload.userId })
            const fileData = {
                resourceId: result.id,
                resourceName: 'ItemRequest',
                folderName: document.folderName,
                originalFileName: document.originalFileName
            }
            await models.File.create(fileData)
            result.documentUrl = document.url
            const agreementItemController = new AgreementItemController(agreement.id)
            let itemAdded = await agreementItemController.createOrUpdate('add', itemPayload)
            return { SOR: result, item: itemAdded }
        } catch (err) {
            throw err
        }
    }
    /**
     * Get agreement special order requests without havin filters
     * @param {Number} agreementId
     */
    static async getAgreementSpecialOrderRequest (agreementId) {
        const query = `SELECT ir.*, 
            a.contractNumber as agreementNumber, 
            ad.addendumNumber FROM ItemRequest ir 
            INNER JOIN Agreement a ON a.id=ir.agreementId  
            LEFT OUTER JOIN Addendum ad ON ad.id = ir.addendumId 
            WHERE ir.agreementId= ${agreementId} AND ir.deletedAt IS NULL`
        const result = await models.sequelize.query(query, {
            type: models.sequelize.QueryTypes.SELECT,
            replacements: {
            }
        })
        return result
    }
}

module.exports = exports = AgreementSpecialOrderRequestController
