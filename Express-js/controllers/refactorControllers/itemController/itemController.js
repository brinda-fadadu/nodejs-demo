const models = require('../../../models')
const logger = require('../../../lib/logger')

class ItemController {
    /**
     * Get attribute filter query
     * @param {Object} attributes has attributeId as the key and value is an array of attribute value Id's
     */
    static getAttributeFiltersQuery (attributes) {
        let queries = []
        let subQuery = ''
        for (var key in attributes) {
            if (attributes[key].length > 0) {
                queries.push(`SELECT iav.itemId FROM itemAttributeValue iav WHERE iav.attributeValueId IN (${attributes[key]})`)
            }
        }
        if (queries.length) {
            subQuery = queries.join(` INTERSECT `)
        }
        return subQuery
    }

    /**
     * Get the primary query to filter the Items table data based on the filter params
     * @param {object} filters has locationId, itemCategoryId, itemTypeId, itemIndustryId, searchTerm, attributes
     */
    static async getPrimaryQuery (filters, agreementTypeId, cemetryAgreementTypeId) {
        const {
            locationId,
            itemCategoryId,
            itemTypeId,
            itemIndustryId,
            searchTerm,
            agreementId,
            vendorId
        } = filters

        let query

        if (agreementId && agreementTypeId[0].type === cemetryAgreementTypeId[0].id) {
            let subQuery
            let filterQuery

            const gardenSpecExceptionQuery = `SELECT * FROM GardenSpecException
            WHERE GardenSpecException.propertyId IN (
                SELECT AgreementProperty.propertyId FROM AgreementProperty
                WHERE AgreementProperty.agreementId = ${agreementId}
                AND AgreementProperty.reservationStatus='confirmed'
                AND AgreementProperty.deletedAt IS NULL
            )`

            const gardenSpecException = await models.sequelize.query(gardenSpecExceptionQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })

            if (gardenSpecException.length > 0) {
                subQuery = `INNER JOIN GardenSpecException ON ItemCategoryAttributeValue.id = GardenSpecException.itemCategoryAttributeValueId
                INNER JOIN Property ON GardenSpecException.propertyId = Property.id`
                filterQuery = `AND GardenSpecException.itemTypeId = ${itemTypeId}`
            } else {
                subQuery = `INNER JOIN GardenSpec ON ItemCategoryAttributeValue.id = GardenSpec.itemCategoryAttributeValueId
                INNER JOIN IntermentRights ON GardenSpec.intermentRightsId = IntermentRights.id
                INNER JOIN PropertyType ON IntermentRights.propertyTypeId = PropertyType.id 
                INNER JOIN PropertyTypeCode ON PropertyTypeCode.propertyTypeId = PropertyType.id                 
                INNER JOIN Property ON PropertyTypeCode.id = Property.propertyTypeCodeId 
                `
                filterQuery = `AND GardenSpec.itemTypeId = ${itemTypeId} AND IntermentRights.propertyCampusId = (
                    SELECT DISTINCT(PropertyCampus.Id) FROM AgreementProperty
                    INNER JOIN Property ON Property.id = AgreementProperty.propertyId
                    INNER JOIN PropertyGarden ON PropertyGarden.id = Property.propertyGardenId
                    INNER JOIN PropertyCampus ON PropertyCampus.id = PropertyGarden.propertyCampusId
                    WHERE AgreementProperty.agreementId = ${agreementId}
                    AND AgreementProperty.deletedAt IS NULL
                    AND AgreementProperty.reservationStatus = 'confirmed'
                )`
            }

            const merchandiseItemTypeId = await models.ItemType.findOne({
                where: {
                    name: 'Merchandises'
                }
            })

            const servicesTypeId = await models.ItemType.findOne({
                where: {
                    name: 'Services'
                }
            })

            let unionQuery = ``

            if (Number(itemTypeId) === merchandiseItemTypeId.id) {
                unionQuery = `UNION (SELECT
                it.id,
                it.name,
                it.vendorId,
                it.code,
                it.updatedAt,
                it.itemCategoryId,
                it.cost
                FROM Item it WHERE it.isActive = 1 and it.code != 'CLCASKET' and it.itemCategoryId IN
                (
                    SELECT id
                    FROM ItemCategory
                    WHERE name IN ('Urn', 'Keepsake', 'Other Merchandise', 'Monument Add On')
                ))`
            }

            if (Number(itemTypeId) === servicesTypeId.id) {
                unionQuery = `UNION (SELECT
                    it.id,
                    it.name,
                    it.vendorId,
                    it.code,
                    it.updatedAt,
                    it.itemCategoryId,
                    it.cost
                    FROM Item it WHERE  it.isActive = 1 and it.itemCategoryId IN
                    (
                        SELECT id
                        FROM ItemCategory
                        WHERE ItemCategory.name IN ('Bequest Service', 'Documentation Fee', 'Other Fee', 'Other Service', 'Cremation Service', 'Memorial Restoration', 'ECF Fee', 'Interment Service')
                        UNION
                        SELECT id
                        FROM ItemCategory
                        WHERE ItemCategory.itemTypeId
                        IN
                        (
                            SELECT id
                            FROM ItemType
                            WHERE name = 'Fee'
                        )
                    )
                )`
            }

            query = `((SELECT DISTINCT it.id, it.name, it.vendorId, it.code, it.updatedAt, it.itemCategoryId, it.cost FROM Item it
            INNER JOIN ItemAttributeValue ON it.id = ItemAttributeValue.itemId
            INNER JOIN ItemCategory ON ItemCategory.id = it.itemCategoryId
            INNER JOIN ItemCategoryAttributeValue ON ItemAttributeValue.attributeValueId = ItemCategoryAttributeValue.attributeValueId
            ${subQuery}
            INNER JOIN AgreementProperty ON Property.id = AgreementProperty.propertyId 
            WHERE it.isActive = 1 and AgreementProperty.agreementId = ${agreementId} 
                AND AgreementProperty.reservationStatus = 'confirmed' 
                AND AgreementProperty.deletedAt IS NULL
                AND ItemCategory.itemTypeId = ${itemTypeId} ${filterQuery})${unionQuery}) 
            AS it
            INNER JOIN LocationItem li ON li.itemId = it.id 
            INNER JOIN Vendor v ON v.id = it.vendorId 
            WHERE it.id is not null AND li.locationId = (
                SELECT locationId FROM Agreement
                WHERE id = ${agreementId}
            )`

            if (filters.searchTerm && filters.searchTerm.trim()) {
                filters.searchTerm = '%' + filters.searchTerm.trim() + '%'
                query += ` AND (it.code LIKE '%${searchTerm}%' OR it.name LIKE '%${searchTerm}%')`
            }

            if (filters.vendorId) {
                query += ` AND (v.vendorId = ${vendorId} )`
            }

            if (filters.attributes) {
                filters.attributes = JSON.parse(filters.attributes)
                let subQuery = this.getAttributeFiltersQuery(filters.attributes)
                query += `AND li.itemId IN ( ` + subQuery + ` )`
            }
            if (filters.itemCategoryId) {
                query += ` AND it.itemCategoryId=${itemCategoryId} `
            }
        } else {
            query = `Item it INNER JOIN 
            LocationItem li ON li.itemId = it.id 
            INNER JOIN Vendor v ON it.vendorId = v.id 
            WHERE it.isActive = 1 and it.code != 'CLCASKET' and li.locationId=${locationId} `
            if (filters.attributes) {
                filters.attributes = JSON.parse(filters.attributes)
                let subQuery = this.getAttributeFiltersQuery(filters.attributes)
                query += `AND li.itemId IN ( ` + subQuery + ` )`
            }
            if (filters.itemCategoryId) {
                query += ` AND it.itemCategoryId=${itemCategoryId} `
            } else {
                query += ` AND it.itemCategoryId IN (SELECT ic.id FROM ItemCategory ic INNER JOIN ItemCategoryIndustry ici ON ici.itemCategoryId=ic.id WHERE ici.itemIndustryId=${itemIndustryId} AND ic.itemTypeId=${itemTypeId} ) `
            }
            if (filters.searchTerm && filters.searchTerm.trim()) {
                filters.searchTerm = '%' + filters.searchTerm.trim() + '%'
                query += ` AND (it.code LIKE '%${searchTerm}%' OR it.name LIKE '%${searchTerm}%')`
            }
            if (filters.miscDecedentId && filters.miscDecedentId === '0') {
                query += ` AND it.itemCategoryId NOT IN (SELECT ic.id FROM ItemCategory ic WHERE ic.name IN ('Cremation Service', 'Disinterment Service')) `
            }
            if (filters.vendorId) {
                query += ` AND (it.vendorId = ${vendorId}) `
            }
        }

        return query
    }

    /**
     * Get filtered Items List based on locationId && ((itemTypeId && itemIndustryId) || itemCategoryId) along with optional attributes and search term
     * @param { object } filters
     */
    static async getItemsByFilter (filters) {
        // Filters: itemIndustryId, itemCategoryId, locationId
        try {
            const { offset, limit, agreementId } = filters
            let cemetryAgreementTypeId
            let agreementTypeId
            let countQuery

            if (agreementId) {
                const cemetryAgreementTypeIdQuery = `SELECT id FROM AgreementType
                WHERE agreementType='Cemetry'`

                cemetryAgreementTypeId = await models.sequelize.query(cemetryAgreementTypeIdQuery, {
                    type: models.sequelize.QueryTypes.SELECT
                })

                const agreementTypeIdQuery = `SELECT type FROM Agreement
                WHERE id=${agreementId}`

                agreementTypeId = await models.sequelize.query(agreementTypeIdQuery, {
                    type: models.sequelize.QueryTypes.SELECT
                })
            }
            const primaryQuery = await this.getPrimaryQuery(filters, cemetryAgreementTypeId, agreementTypeId)

            if (agreementId && agreementTypeId[0].type === cemetryAgreementTypeId[0].id) {
                countQuery = `SELECT ISNULL(SUM(it.total), 0) AS total FROM (SELECT COUNT(DISTINCT(it.id)) AS total FROM ${primaryQuery} GROUP BY it.id, li.id, it.name, it.code, li.price, it.updatedAt) AS it`
            } else {
                countQuery = `SELECT COUNT(it.id) AS total FROM ${primaryQuery}`
            }

            const itemsQuery = `SELECT DISTINCT  it.id, v.id as vendorId, v.name AS vendorName, li.id as locationItemId,it.name, it.code, li.price, it.cost,
            (SELECT attribute.id,attribute.name, attributeValue.name as attributeValue, attributeValue.id AS attributeValueId FROM Attribute attribute INNER JOIN AttributeValue attributeValue  ON attribute.id=attributeValue.attributeId INNER JOIN ItemAttributeValue iav ON iav.attributeValueId=attributeValue.id WHERE iav.itemId=it.id FOR JSON PATH) as attributes,
            (
                SELECT itemImages.id, itemImages.isPrimary, itemImages.imageUrl, itemImages.deletedAt, itemImages.deletedBy FROM ItemImages itemImages 
                WHERE itemImages.resourceId=it.id AND itemImages.resourceType='Item' AND itemImages.deletedAt IS NULL AND itemImages.deletedBy IS NULL
                FOR JSON PATH
            ) as itemImages
            FROM ${primaryQuery} GROUP BY it.id,v.id,v.name,li.id,it.name, it.code, li.price, it.updatedAt, it.cost ORDER BY it.id  OFFSET ${offset} ROWS FETCH  NEXT ${limit} ROWS ONLY`

            const result = await models.sequelize.query(itemsQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })
            const count = await models.sequelize.query(countQuery, {
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
}

module.exports = ItemController
