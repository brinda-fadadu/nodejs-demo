const models = require('../../../models')
class CategoryController {
    /**
     * Call this function to get all the attributes relates to a category
     * @param {number} categoryId
     */
    static async getCategoryAttributes (categoryId) {
        return models.Attribute.findAll({
            where: { },
            attributes: ['id', 'name'],
            required: true,
            include: [{
                model: models.AttributeValue,
                as: 'attributeValues',
                attributes: ['id', 'name'],
                required: true,
                include: [{
                    model: models.ItemCategoryAttributeValue,
                    as: 'AttributeCategoryValues',
                    attributes: [],
                    where: {
                        itemCategoryId: categoryId
                    },
                    required: true
                }]
            }]
        })
    }
    /**
     * Call this function to get the categories based on ItemTypeId and industry
     * @param {number} itemTypeId
     * @param {number} itemIndustryId
     */
    static async getCategories (itemTypeId, itemIndustryId, agreementId) {
        let whereCondition = {}
        if (itemIndustryId) {
            whereCondition.itemIndustryId = itemIndustryId
        }
        let result = await models.ItemCategory.findAll({
            where: {
                itemTypeId: itemTypeId
            },
            attributes: ['id', 'name', 'code'],
            required: true,
            include: [{
                model: models.ItemCategoryIndustry,
                as: 'itemCategoryIndustry',
                where: whereCondition,
                attributes: []
            }]
        })
        if (agreementId) result = await this.loadMiscCategories(result, agreementId, itemTypeId)
        return result
    }

    static async loadMiscCategories (categories, agreementId, itemTypeId) {
        const agreementInfo = await models.sequelize.query(`SELECT A.type, ATY.agreementType from Agreement AS A
                INNER JOIN SaleType AS ST ON ST.id = A.saleTypeId
                INNER JOIN agreementType AS ATY ON ATY.id = ST.agreementType
                where A.id = ${agreementId}`,
        {
            type: models.sequelize.QueryTypes.SELECT,
            plain: true
        })

        const servicesTypeId = await models.ItemType.findOne({
            where: {
                name: 'Services'
            }
        })
        const merchandiseItemTypeId = await models.ItemType.findOne({
            where: {
                name: 'Merchandises'
            }
        })

        if (categories.length > 0 && parseInt(itemTypeId) === servicesTypeId.id) {
            const funeralCategories = ['Catering', 'Mortuary Facility']

            if (agreementInfo.agreementType === 'Cemetry') categories = categories.filter(r => funeralCategories.indexOf(r.name) < 0)
            else categories = categories.filter(r => funeralCategories.indexOf(r.name) >= 0)
        } else if (categories.length > 0 && parseInt(itemTypeId) === merchandiseItemTypeId.id) {
            const funeralMrchanidiseCat = ['FLORAL', 'Funeral Service Accessory', 'Keepsake', 'Urn']
            const cementryMrchanidiseCat = ['Keepsake', 'Other Merchandise', 'Urn']

            if (agreementInfo.agreementType === 'Cemetry') categories = categories.filter(r => cementryMrchanidiseCat.indexOf(r.name) >= 0)
            else categories = categories.filter(r => funeralMrchanidiseCat.indexOf(r.name) >= 0)
        }
        return categories
    }
}

module.exports = CategoryController
