const moment = require('moment')
const models = require('../../../models')
const ItemController = require('../itemController/itemController')
const logger = require('../../../lib/logger')
const UploadFileController = require('../uploadFileController/uploadFileController')
let uploadFileController = new UploadFileController()

class ItemImageUploadController {
    constructor (itemId, itemType) {
        this.itemId = itemId
        if (itemType.trim() === 'Packages') {
            this.resourceType = models.Package
        } else {
            this.resourceType = models.Item
        }
    }

    /**
     * @param {number} filters.itemTypeId itemType Id to query on types
     * @param {number} filters.itemCategoryId itemCategory to query on categories
     * @param {string} filters.searchTerm to query on code or name of the items
     * @param {array}  filters.attributes to query on the different attributes of the item
     */
    static getPrimaryQuery (filters) {
        const { attributes, itemTypeId, itemCategoryId, searchTerm } = filters
        let query = `Item it  WHERE it.itemCategoryId IN (SELECT ic.id FROM ItemCategory ic INNER JOIN ItemCategoryIndustry ici ON ici.itemCategoryId=ic.id WHERE ic.itemTypeId=${itemTypeId} ) `

        if (attributes) {
            const parsedAttributes = JSON.parse(attributes)
            const subQuery = ItemController.getAttributeFiltersQuery(parsedAttributes)
            query += `AND it.id IN (` + subQuery + `)`
        }
        if (itemCategoryId) {
            query += ` AND it.itemCategoryId=${itemCategoryId} `
        }
        if (searchTerm && searchTerm.trim()) {
            filters.searchTerm = '%' + filters.searchTerm.trim() + '%'
            query += ` AND (it.code LIKE '%${searchTerm}%' OR it.name LIKE '%${searchTerm}%')`
        }
        return query
    }
    /**
     * @param {Object} filters object of a query parameters
     * @param {number} filters.page
     * @param {number} filters.limit
     * @param {number} filters.itemTypeId itemType Id to query on types
     * @param {number} filters.itemCategoryId itemCategory to query on categories
     * @param {string} filters.searchTerm to query on code or name of the items
     * @param {array}  filters.attributes to query on the different attributes of the item
     */
    static async getListOfItems (filters) {
        try {
            const { offset, limit } = filters
            const primaryQuery = this.getPrimaryQuery(filters)
            const itemsQuery = `SELECT DISTINCT it.id, it.name as name, it.code as code,
            (SELECT attribute.id, attribute.name, attributeValue.name as attributeValue, attributeValue.id as attributeValueId
            FROM Attribute attribute INNER JOIN AttributeValue attributeValue ON attribute.id=attributeValue.attributeId
                INNER JOIN ItemAttributeValue iav ON iav.attributeValueId=attributeValue.id
            WHERE iav.itemId=it.id
            FOR JSON PATH
            ) as attributes,
            (
                SELECT itemImages.id, itemImages.isPrimary, itemImages.imageUrl, itemImages.deletedAt, itemImages.deletedBy FROM ItemImages itemImages 
                WHERE itemImages.resourceId=it.id AND itemImages.resourceType='Item' AND itemImages.deletedAt IS NULL AND itemImages.deletedBy IS NULL
                FOR JSON PATH
                ) as itemImages
        FROM ${primaryQuery} ORDER by it.id OFFSET ${offset} ROWS FETCH  NEXT ${limit} ROWS ONLY`
            const countQuery = `SELECT COUNT(it.id) AS total FROM ${primaryQuery}`
            const count = await models.sequelize.query(countQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })

            const result = await models.sequelize.query(itemsQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })
            return {
                total: count[0].total,
                items: result.length ? result.map(element => {
                    return {
                        ...element,
                        itemImages: element.itemImages ? JSON.parse(element.itemImages) : []
                    }
                }) : []
            }
        } catch (err) {
            logger.log('error', err.message)
            throw err
        }
    }

    async createItemImages (files, currentUser) {
        try {
            let resourceType = await this.resourceType.findOne({
                where: {
                    id: this.itemId
                }
            })

            if (!resourceType) {
                throw new Error('ITEM NOT FOUND')
            }

            let existingImages = await models.ItemImages.findAndCountAll({
                where: {
                    resourceId: this.itemId,
                    resourceType: this.resourceType.name,
                    deletedAt: null
                }
            })

            if ((existingImages.count + files.length) > 3) {
                throw new Error('CANNOT ADD MORE THAN THREE IMAGES PER ITEM')
            }

            let imageUrls = await this.uploadImages(files, 'itemImages')

            let images = imageUrls.map(imageUrl => ({
                resourceType: this.resourceType.name,
                resourceId: this.itemId,
                createdBy: currentUser.id,
                updatedBy: currentUser.id,
                isPrimary: false,
                imageUrl
            }))

            if (existingImages.count === 0) {
                images[0].isPrimary = true
            }

            await models.ItemImages.bulkCreate(images)

            let allImages = await models.ItemImages.findAndCountAll({
                where: {
                    resourceId: this.itemId,
                    resourceType: this.resourceType.name,
                    deletedAt: null
                }
            })

            return allImages.rows
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    async uploadImages (files, folder) {
        try {
            //  let imageUrls = []
            if (files) {
                let images = await Promise.all(files.map(async (file) => {
                    let url = await uploadFileController.uploadFile(file, folder)
                    return url
                }))
                return images
            }
        } catch (err) {
            logger.log('error', err.message)
            throw err
        }
    }

    async deleteItemImage (id, currentUser) {
        const transaction = await models.sequelize.transaction()
        try {
            let existingImages = await models.ItemImages.findAndCountAll({
                where: {
                    resourceId: this.itemId,
                    resourceType: this.resourceType.name,
                    deletedAt: null
                },
                transaction
            })

            let imageToDelete = existingImages.rows.filter(image => image.id === id)

            if (!imageToDelete.length) {
                throw new Error('IMAGE DOESNOT BELONG TO THIS ITEM')
            }

            existingImages.rows = existingImages.rows.filter(image => image.id !== id)

            if (imageToDelete[0].isPrimary && existingImages.count > 1) {
                existingImages.rows[0].isPrimary = true
                await models.ItemImages.update({
                    isPrimary: true
                },
                {
                    where: {
                        id: existingImages.rows[0].id
                    },
                    transaction: transaction
                })
            }

            await models.ItemImages.update({
                deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                deletedBy: currentUser.id
            },
            {
                where: { id },
                transaction
            })

            await transaction.commit()
            existingImages.count -= 1

            return existingImages
        } catch (err) {
            await transaction.rollback()
            logger.log('error', err.message)
            throw err
        }
    }

    async makePrimary (id, currentUser) {
        const transaction = await models.sequelize.transaction()
        try {
            let existingImages = await models.ItemImages.findAndCountAll({
                where: {
                    resourceId: this.itemId,
                    resourceType: this.resourceType.name,
                    deletedAt: null
                }
            })

            if (!existingImages.rows.filter(image => image.id === id).length) {
                throw new Error('IMAGE DOESNOT BELONG TO THIS ITEM')
            }

            let imageToMakeSecondary = existingImages.rows.filter(image => image.isPrimary)[0]

            await models.ItemImages.update({
                isPrimary: false,
                updatedBy: currentUser.id
            },
            {
                where: {
                    id: imageToMakeSecondary.id
                },
                transaction
            })

            await models.ItemImages.update({
                isPrimary: true,
                updatedBy: currentUser.id
            },
            {
                where: { id },
                transaction
            })

            await transaction.commit()

            const images = await models.ItemImages.findAndCountAll({
                where: {
                    resourceId: this.itemId,
                    resourceType: this.resourceType.name,
                    deletedAt: null
                }
            })

            return images
        } catch (err) {
            await transaction.rollback()
            logger.log('error', err.message)
            throw err
        }
    }
}
module.exports = ItemImageUploadController
