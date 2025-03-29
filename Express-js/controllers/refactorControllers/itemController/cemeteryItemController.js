const models = require('../../../models')
const logger = require('../../../lib/logger')
const lodash = require('lodash')

class CemeteryItemController {
    constructor (agreementId) {
        this.agreementId = agreementId
    }

    /**
     * Get attribute value
     * @param {number} attributeValueId
     */
    async getAttributeValue (attributeValueId) {
        const AttributeValueQuery = `SELECT AttributeValue.id, AttributeValue.name
        FROM AttributeValue
        WHERE AttributeValue.id = ${attributeValueId}`

        const AttributeValue = await models.sequelize.query(AttributeValueQuery, {
            type: models.sequelize.QueryTypes.SELECT
        })

        return AttributeValue[0]
    }

    /**
     * Get values of a column for a particular memorialTypeAttributeValueId from the memorialCategoriesQuery
     * @param {number} memorialTypeAttributeValueId
     * @param {string} memorialCategoriesQuery
     * @param {string} columnName
     */
    async getColumnValues (memorialTypeAttributeValueId, memorialCategoriesQuery, columnName) {
        // Query to fetch the distinct memorialSizeAttributeValueIds from the memorialCategoriesQuery for a particular memorialTypeAttributeValueId
        let columnValuesQuery = `SELECT DISTINCT(gsm.${columnName}) FROM (${memorialCategoriesQuery}) gsm
        WHERE gsm.memorialTypeAttributeValueId = ${memorialTypeAttributeValueId}`

        const columnValues = await models.sequelize.query(columnValuesQuery, {
            type: models.sequelize.QueryTypes.SELECT
        })

        let parsedColumnValues = columnValues.map(value => value[columnName])

        return parsedColumnValues
    }

    /**
     * Get memorial attribute values in the desired format
     * @param {array} memorialCategories
     * @param {string} memorialCategoriesQuery
     */
    async getMemorialCategoriesValues (memorialCategories, memorialCategoriesQuery) {
        let memorialCategoriesValues = await Promise.all(memorialCategories.map(async (categories) => {
            return {
                id: categories.id,
                memorialType: await this.getAttributeValue(categories.memorialTypeAttributeValueId),
                memorialSizeIds: await this.getColumnValues(categories.memorialTypeAttributeValueId, memorialCategoriesQuery, 'memorialSizeAttributeValueId')
            }
        }))
        return memorialCategoriesValues
    }

    /**
     * Get monument items for the given memorialType, memorialSize, other attribute value ids and agreementId
     * * @param {number} memorialTypeId
     * * @param {array} memorialSizeIds
     * * @param {number} agreementId
     * * @param {array} otherAttributeValueIds
     */
    static async getMonumentItems (memorialTypeId, memorialSizeIds, agreementId, otherAttributeValueIds = false) {
        try {
            let queryTypes = {}
            let mainQueryArray = []
            if (memorialTypeId) {
                queryTypes = {
                    ...queryTypes,
                    'MemorialType': [memorialTypeId]
                }
            }
            if (memorialSizeIds && lodash.compact(memorialSizeIds).length) {
                queryTypes = {
                    ...queryTypes,
                    'MemorialSize': [...memorialSizeIds]
                }
            }
            if (otherAttributeValueIds && lodash.compact(otherAttributeValueIds).length) {
                queryTypes = {
                    ...queryTypes,
                    'Other': [...otherAttributeValueIds]
                }
            }
            Object.keys(queryTypes).forEach((attributeType) => {
                let attributeIds = queryTypes[attributeType]
                mainQueryArray.push(
                    `SELECT Item.id, LocationItem.id AS locationItemId, Item.name AS itemName , Item.code AS code
                    FROM Item
                    INNER JOIN ItemAttributeValue ON Item.id = ItemAttributeValue.itemId
                    INNER JOIN AttributeValue ON ItemAttributeValue.attributeValueId = AttributeValue.id
                    INNER JOIN LocationItem ON Item.id = LocationItem.itemId
                    WHERE Item.itemCategoryId = (SELECT id FROM ItemCategory WHERE name = 'Memorial')
                    AND LocationItem.locationId = (SELECT locationId FROM Agreement WHERE id = ${agreementId})
                    AND AttributeValue.id IN (${attributeIds})
                    AND Item.isActive = 1
                    GROUP BY Item.id, Item.name, LocationItem.id, Item.code`
                )
            })

            let monumentItemsQuery = mainQueryArray.join(' INTERSECT ')

            const monumentItems = await models.sequelize.query(monumentItemsQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })

            return {
                success: true,
                data: monumentItems
            }
        } catch (err) {
            logger.log('error', err.message)
            throw err
        }
    }

    /**
     * Get cash advance items price and county details for the received item id
     * * @param {number} itemId
    */
    static async getCashAdvanceItemsPrice (itemId) {
        try {
            let cashAdvanceItemCheckQuery = `
            SELECT
            COUNT(Item.id) OVER () AS cashAdvanceItem, Item.name
            FROM Item
            INNER JOIN ItemCategory ON ItemCategory.id = Item.itemCategoryId
            WHERE ItemCategory.name = 'Cash Advance'
            AND Item.id =:itemId`

            let cashAdvanceItemCheck = await models.sequelize.query(cashAdvanceItemCheckQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    itemId
                }
            })

            let cashAdvanceItemPriceQuery = ''
            let cashAdvanceItemPriceDetails = []

            // Proceed with the listing of the details only if it's a cash advance item, else throw an error
            if (lodash.get(cashAdvanceItemCheck, '[0].cashAdvanceItem', 0) > 0) {
                cashAdvanceItemPriceQuery = `
                SELECT
                CashAdvanceItemsPrice.*,
                County.description AS county,
                Item.code AS itemCode
                FROM CashAdvanceItemsPrice
                INNER JOIN Item ON Item.id = CashAdvanceItemsPrice.itemId
                INNER JOIN County ON County.id = CashAdvanceItemsPrice.countyId
                WHERE CashAdvanceItemsPrice.itemId =:itemId`

                cashAdvanceItemPriceDetails = await models.sequelize.query(cashAdvanceItemPriceQuery, {
                    type: models.sequelize.QueryTypes.SELECT,
                    replacements: {
                        itemId
                    }
                })
            } else {
                throw new Error('NOT_A_CASH_ADVANCE_ITEM')
            }

            return {
                success: true,
                data: cashAdvanceItemPriceDetails,
                isDeathCertificate: lodash.get(cashAdvanceItemCheck, '[0].name') === 'Death Certificate'
            }
        } catch (err) {
            logger.log('error', err.message)
            throw err
        }
    }

    /**
     * A pre-check function to check, If the received property belong in memorial exception or not, and fetch it's corresponding monument items
     * * @param {array} propertyIds
     * * @param {number} memorialTypeId
     * * @param {boolean} isSideBySide
     */
    /**
     *
     * Need to check the following scenarios
     * 1. When it's a single property of normal - Then normal - Check
     * 2. When it's a single property of exception - Then exception - Check
     * 3. When it's multiple normal properties - Then normal - Check
     * 4. When it's multiple exception properties -  Then exception - Check
     * 5. When it's one normal and an exception - Then normal - Check
     */
    async getMonumentExceptionItems (receivedProperties = [], memorialTypeId, isSideBySide) {
        try {
            let propertyMonumentItems = []
            let monumentItems
            let isException = false
            let propertyDetails = await this.getMemorialProperties()
            let exceptionPropertyList = await this.getMemorialSpecExceptionPropertyList(this.agreementId, true)
            let propertyIds = receivedProperties && receivedProperties.length ? receivedProperties : propertyDetails.properties.map(prop => prop.id).sort()
            let exceptionPropertyIds = exceptionPropertyList.map(prop => prop.propertyId).sort()
            isException = (propertyIds.length > 1 && exceptionPropertyIds.length > 0 && !lodash.isEqual(propertyIds, exceptionPropertyIds))
            if (receivedProperties && receivedProperties.length) {
                if (isException) {
                    await Promise.all(receivedProperties.map(async (property) => {
                        let item = await this.getMonumentExceptionItemsFinder([property], memorialTypeId, isSideBySide, isException)
                        propertyMonumentItems.push(...item.data)
                    }))
                    monumentItems = {
                        success: true,
                        data: lodash.uniqBy(propertyMonumentItems, 'id')
                    }
                } else {
                    monumentItems = await this.getMonumentExceptionItemsFinder(receivedProperties, memorialTypeId, isSideBySide, false)
                }
            } else {
                let normalProperties = propertyDetails['properties'].map((property) => {
                    return {
                        propertyId: [property.id],
                        isSideBySide: 0
                    }
                })
                let sideBySideProperties = propertyDetails['sideBySideProperties'].map((property) => {
                    return {
                        propertyId: property.properties.map((item) => item.id),
                        isSideBySide: 1
                    }
                })
                propertyIds = [...normalProperties, ...sideBySideProperties]
                // While edit, we should fetch the items from garden spec memorial
                if (isException) {
                    let properPropertyIds = propertyIds.map((item) => item.propertyId)
                    monumentItems = await this.getMonumentExceptionItemsFinder(lodash.uniq(lodash.flattenDeep(properPropertyIds)), memorialTypeId, false, isException)
                } else {
                    await Promise.all(propertyIds.map(async (property) => {
                        let item = await this.getMonumentExceptionItemsFinder(property.propertyId, memorialTypeId, property.isSideBySide, isException)
                        propertyMonumentItems.push(...item.data)
                    }))
                    propertyMonumentItems = lodash.uniqBy(propertyMonumentItems, 'id')
                    monumentItems = {
                        success: true,
                        data: propertyMonumentItems
                    }
                }
            }
            return monumentItems
        } catch (err) {
            logger.log('error', err.message)
            throw err
        }
    }

    /**
     * A function to check, If the received property belong in memorial exception or not, and fetch it's corresponding monument items
     * * @param {array} propertyIds
     * * @param {number} memorialTypeId
     * * @param {boolean} isSideBySide
     * * @param {boolean} isExcpetion
     */
    async getMonumentExceptionItemsFinder (propertyIds, receivedMemorialTypeId, isSideBySide, isExcpetion = false) {
        try {
            let memorialTypeId = receivedMemorialTypeId
            let newPropertyIds = isExcpetion ? false : propertyIds
            let exceptionProperties = await this.getMemorialSpecExceptionPropertyList(this.agreementId, true, newPropertyIds)
            let memorialSizeIds
            let otherAttributeValueIds
            let monumentItems

            exceptionProperties = exceptionProperties.map((property) => property.propertyId)

            // TODO: It should fetch a union of exception and normal when it's a combination of normal and exception during creation
            if (exceptionProperties && exceptionProperties.length && lodash.isEqual(exceptionProperties.sort(), propertyIds.sort())) {
                // Inorder to tackle the situation where the property id does not have any memorial type id fetch the memorial id before fetching the gardenSpecMemorialException details
                let sideBySideFilter = ''
                if (isSideBySide === 0) {
                    sideBySideFilter = `AND GardenSpecMemorialException.isSideBySideRule = ${isSideBySide}`
                } else if (isSideBySide === 1) {
                    sideBySideFilter = `AND GardenSpecMemorialException.isSideBySideRule IN (0,${isSideBySide})`
                }
                let memorialTypeIds = await models.sequelize.query(`
                SELECT DISTINCT memorialTypeAttributeValueId
                FROM GardenSpecMemorialException
                WHERE propertyId IN (:exceptionProperties)
                ${sideBySideFilter}`, {
                    type: models.sequelize.QueryTypes.SELECT,
                    replacements: {
                        exceptionProperties
                    }
                })
                memorialTypeIds = memorialTypeIds.map((item) => item.memorialTypeAttributeValueId)
                memorialTypeId = memorialTypeIds && memorialTypeIds.length && memorialTypeIds.includes(receivedMemorialTypeId) ? receivedMemorialTypeId : null
                let exceptionPropertyDetails = await this.getMemorialSpecExceptionPropertyList(this.agreementId, false, propertyIds, memorialTypeId, isSideBySide)
                memorialSizeIds = lodash.uniq(exceptionPropertyDetails.map((memorialSpec) => memorialSpec.memorialSizeAttributeValueId))
                otherAttributeValueIds = exceptionPropertyDetails.map((memorialSpec) => JSON.parse(memorialSpec.otherAttributeValueIds))
                otherAttributeValueIds = lodash.uniq(lodash.flattenDeep(otherAttributeValueIds))
            } else {
                let hasSideBySideBit = 0
                const sidebysideProperties = await models.sequelize.query(`SELECT * FROM SideBySideProperty WHERE agreementId=${this.agreementId} and deletedAt IS NULL`, {
                })
                if (sidebysideProperties[0].length) {
                    hasSideBySideBit = 1
                }
                // Query to fetch the intermentRightsIds for a particular agreement using agreementId
                const subQuery = `(
                    SELECT IntermentRights.id FROM IntermentRights
                    INNER JOIN PropertyType ON IntermentRights.propertyTypeId = PropertyType.id
                    INNER JOIN PropertyTypeCode ON PropertyTypeCode.propertyTypeId = PropertyType.id
                    INNER JOIN Property ON PropertyTypeCode.id = Property.propertyTypeCodeId
                    INNER JOIN AgreementProperty ON Property.id = AgreementProperty.propertyId
                    WHERE AgreementProperty.agreementId = ${this.agreementId} AND IntermentRights.propertyCampusId IN (
                        SELECT DISTINCT(PropertyCampus.Id) FROM AgreementProperty
                        INNER JOIN Property ON Property.id = AgreementProperty.propertyId
                        INNER JOIN PropertyGarden ON PropertyGarden.id = Property.propertyGardenId
                        INNER JOIN PropertyCampus ON PropertyCampus.id = PropertyGarden.propertyCampusId
                        WHERE AgreementProperty.agreementId = ${this.agreementId}
                        AND AgreementProperty.reservationStatus = 'confirmed'
                        AND AgreementProperty.deletedAt IS NULL
                        AND AgreementProperty.deletedBy IS NULL
                    )
                    AND AgreementProperty.reservationStatus = 'confirmed'
                    AND AgreementProperty.deletedAt IS NULL
                    AND AgreementProperty.deletedBy IS NULL
                    AND IntermentRights.graves = (CASE WHEN PropertyType.name = 'Grave' AND ${hasSideBySideBit} = 0 THEN 1 ELSE IntermentRights.graves END )
                )`
                let gardenSpecMemoiralSizeIdsQuery = `
                SELECT DISTINCT (GardenSpecMemorial.memorialSizeAttributeValueId)
                FROM GardenSpecMemorial
                WHERE GardenSpecMemorial.intermentRightsId IN (${subQuery})
                AND GardenSpecMemorial.memorialTypeAttributeValueId =:memorialTypeId`

                let gardenSpecMemoiralSizeIds = await models.sequelize.query(gardenSpecMemoiralSizeIdsQuery, {
                    type: models.sequelize.QueryTypes.SELECT,
                    replacements: {
                        memorialTypeId
                    }
                })
                memorialSizeIds = gardenSpecMemoiralSizeIds.map((memorialSpec) => memorialSpec.memorialSizeAttributeValueId)
            }

            monumentItems = await CemeteryItemController.getMonumentItems(memorialTypeId, memorialSizeIds, this.agreementId, otherAttributeValueIds)

            return monumentItems
        } catch (err) {
            logger.log('error', err.message)
            throw err
        }
    }

    /**
     * Get memorial attribute value id for the given monumentItemId and attribute
     * * @param {number} monumentItemId
     * * @param {string} attribute
     */
    static async getMemorialAttributeValueId (monumentItemId, attribute) {
        try {
            // Query to fetch the memorial attribute value id for the given monumentItemId and attribute
            const monumentItemAttributeValueIdQuery = `SELECT AttributeValue.id FROM AttributeValue
            INNER JOIN ItemAttributeValue ON AttributeValue.id = ItemAttributeValue.attributeValueId
            WHERE ItemAttributeValue.itemId = ${monumentItemId} AND AttributeValue.attributeId = (
                SELECT id FROM Attribute
                WHERE name = '${attribute}'
            )`

            const monumentItemAttributeValueId = await models.sequelize.query(monumentItemAttributeValueIdQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })

            return monumentItemAttributeValueId[0]
        } catch (err) {
            logger.log('error', err.message)
            throw err
        }
    }

    /**
     * Get memorial spec or memorial add on spec attribute value ids for the given memorialTypeAttributeValueId, memorialSizeAttributeValueId, category and attributeType
     * * @param {number} monumentItemMemorialTypeAttributeValueId
     * * @param {number} monumentItemMemorialSizeAttributeValueId
     * * @param {string} category
     * * @param {string} attributeType
     */
    static async getMonumentItemMemorialSpecAttributeValueIds (monumentItemMemorialTypeAttributeValueId, monumentItemMemorialSizeAttributeValueId, category, attributeType, propertyIds) {
        try {
            let selectColumn = 'attributeValueIds'
            let fromTable = 'MemorialSpec'
            let categoryColum = 'itemCategoryId'
            let filteringCondition = ''
            let addOnTypeColumn = ''
            let monumentItemMemorialSpecAddOnTypeAttributeValueIds = []
            let sizeAttributeFilter = ''
            const attributeTypeValueIdQuery = `SELECT TOP 1(AttributeValue.id) FROM AttributeValue
            INNER JOIN Attribute ON Attribute.id = AttributeValue.attributeId
            WHERE AttributeValue.name = '${attributeType}' AND Attribute.id = (
                SELECT id FROM Attribute
                WHERE name = 'Memorial Add On'
            )`
            let attributeTypeValueIdArray = []

            if (monumentItemMemorialSizeAttributeValueId) sizeAttributeFilter = `AND memorialSizeAttributeValueId=${monumentItemMemorialSizeAttributeValueId}`
            if (category === 'Monument Add On') {
                selectColumn = 'addOnAttributeValueIds'
                fromTable = 'MemorialAddOnSpec'
                categoryColum = 'addOnItemCategoryId'
                filteringCondition = `AND addOnTypeAttributeValueId = (
                    ${attributeTypeValueIdQuery}
                )`
                addOnTypeColumn = 'addOnTypeAttributeValueId'
            }
            let monumentItemMemorialSpecAttributeValueIds = []
            let memorialAddOnExceptionAttributeIds = []
            if (propertyIds && propertyIds.length) {
                const exceptionAddOnsQuery = `select * from MemorialAddOnSpecException where propertyId in (${propertyIds.join(',')})`
                memorialAddOnExceptionAttributeIds = await models.sequelize.query(exceptionAddOnsQuery, {
                    type: models.sequelize.QueryTypes.SELECT
                })
            }
            // Query to fetch the memorial spec or memorial add on spec attribute value ids for the given memorialTypeAttributeValueId, memorialSizeAttributeValueId, category and attributeType
            const monumentItemMemorialSpecAttributeValueIdsQuery = `SELECT ${selectColumn} FROM ${fromTable}
            WHERE memorialTypeAttributeValueId=${monumentItemMemorialTypeAttributeValueId} ${sizeAttributeFilter} AND ${categoryColum} = (
                SELECT id FROM ItemCategory
                WHERE name = '${category}'
            ) ${filteringCondition}`

            monumentItemMemorialSpecAttributeValueIds = await models.sequelize.query(monumentItemMemorialSpecAttributeValueIdsQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })

            let monumentItemMemorialSpecAttributeValueIdsArray = monumentItemMemorialSpecAttributeValueIds.map((attributeValueId) => attributeValueId[selectColumn] ? JSON.parse(attributeValueId[selectColumn]) : false)
            monumentItemMemorialSpecAttributeValueIdsArray = lodash.compact(monumentItemMemorialSpecAttributeValueIdsArray)

            if (category === 'Monument Add On') {
                const monumentItemMemorialSpecAddOnTypeAttributeValueIdsQuery = `SELECT ${addOnTypeColumn} FROM ${fromTable}
                WHERE memorialTypeAttributeValueId=${monumentItemMemorialTypeAttributeValueId} ${sizeAttributeFilter} AND ${categoryColum} = (
                    SELECT id FROM ItemCategory
                    WHERE name = '${category}'
                ) ${filteringCondition}`

                monumentItemMemorialSpecAddOnTypeAttributeValueIds = await models.sequelize.query(monumentItemMemorialSpecAddOnTypeAttributeValueIdsQuery, {
                    type: models.sequelize.QueryTypes.SELECT
                })

                let attributeTypeValueId = await models.sequelize.query(attributeTypeValueIdQuery, {
                    type: models.sequelize.QueryTypes.SELECT
                })

                attributeTypeValueIdArray = attributeTypeValueId.map((attributeValue) => attributeValue.id)

                if (monumentItemMemorialSpecAddOnTypeAttributeValueIds.length && !monumentItemMemorialSpecAttributeValueIdsArray.length) {
                    monumentItemMemorialSpecAttributeValueIdsArray = [attributeTypeValueIdArray]
                } else {
                    monumentItemMemorialSpecAttributeValueIdsArray = monumentItemMemorialSpecAttributeValueIdsArray.map((attributeValuesIds) => {
                        return [
                            ...attributeValuesIds,
                            ...attributeTypeValueIdArray
                        ]
                    })
                }
            }

            return [...monumentItemMemorialSpecAttributeValueIdsArray, ...memorialAddOnExceptionAttributeIds]
        } catch (err) {
            logger.log('error', err.message)
            throw err
        }
    }

    /**
     * Get intersection query to fetch items for a particular attributeValueId, category and agreementId
     * * @param {array} attributeValueId
     * * @param {string} category
     * * @param {number} agreementId
     */
    static async generateIntersectQuery (attributeValueId, category, agreementId, isException = false) {
        try {
            let isRequiredQuery = ''
            if (isException) {
                isRequiredQuery = `INNER JOIN MemorialAddOnSpecException mase on mase.attributeValueId=AttributeValue.id`
            }
            const Query = `SELECT Item.id, LocationItem.id AS locationItemId, Item.name AS itemName FROM Item
            INNER JOIN ItemAttributeValue ON ItemAttributeValue.itemId = Item.id
            INNER JOIN AttributeValue ON AttributeValue.id = ItemAttributeValue.attributeValueId
            INNER JOIN Attribute ON Attribute.id = AttributeValue.attributeId
            INNER JOIN LocationItem ON Item.id = LocationItem.itemId ${isRequiredQuery}
            WHERE AttributeValue.id = ${attributeValueId}
            AND Item.itemCategoryId = (
                SELECT id FROM ItemCategory
                WHERE name='${category}'
            )
            AND LocationItem.locationId = (
                SELECT locationId FROM Agreement
                WHERE id = ${agreementId}
            )
            AND Item.isActive = 1
            GROUP BY Item.id, LocationItem.id, Item.name`

            return Query
        } catch (err) {
            logger.log('error', err.message)
            throw err
        }
    }

    /**
     * Get items for a particular category based on the attributeValueIds and agreementId
     * * @param {array} monumentItemAttributeValueIds
     * * @param {string} category
     * * @param {number} agreementId
     */
    static async getMonumentItemsOnCategory (monumentItemAttributeValueIds, category, agreementId) {
        try {
            const intersectQuery = await Promise.all(monumentItemAttributeValueIds.map(async (attributeValueIdsArray) => {
                let Query
                if (Array.isArray(attributeValueIdsArray)) {
                    Query = await Promise.all(attributeValueIdsArray.map((attributeValueId) => this.generateIntersectQuery(attributeValueId, category, agreementId)))
                } else {
                    Query = [await this.generateIntersectQuery(attributeValueIdsArray.attributeValueId, category, agreementId, true)]
                }
                let TotalQuery = Query.join(' INTERSECT ')
                return `(${TotalQuery})`
            }))
            let unionQuery = intersectQuery.join(' UNION ')
            // Query to fetch the items for a particular category based on the attributeValueIds and agreementId
            const result = await models.sequelize.query(unionQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })

            return result
        } catch (err) {
            logger.log('error', err.message)
            throw err
        }
    }

    /**
     * Get item categories for a memorial based on memorialTypeId and memorialSizeId
     * * @param {number} memorialTypeId
     * * @param {number} memorialSizeId
     */
    static async getItemCategoriesOfMemorial (memorialTypeId, memorialSizeId) {
        try {
            let sizeAttributeFilter = ''

            if (memorialSizeId) sizeAttributeFilter = `and memorialSizeAttributeValueId=${memorialSizeId}`
            let itemCategoriesQuery = `
            select distinct ic.*
            from MemorialSpec ms
            inner join ItemCategory ic on ic.id=ms.itemCategoryId
            where memorialTypeAttributeValueId=${memorialTypeId} ${sizeAttributeFilter}`
            const itemCategories = await models.sequelize.query(itemCategoriesQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })
            return itemCategories
        } catch (error) {
            logger.log('error', error.message)
            throw error
        }
    }

    /**
     * Get item categories for a memorialAddons based on memorialTypeId and memorialSizeId
     * * @param {number} memorialTypeId
     * * @param {number} memorialSizeId
     */
    static async getAttributeValuesOfMemorialAddOns (memorialTypeId, memorialSizeId, exceptionPropertyList) {
        try {
            let sizeAttributeFilter = ''
            if (memorialSizeId) sizeAttributeFilter = `and memorialSizeAttributeValueId=${memorialSizeId}`

            let exceptionItemCategoriesQuery = `
            select distinct av.*
            from MemorialAddOnSpecException mase
            inner join AttributeValue av on av.id=mase.attributeValueId
            inner join Property p on p.id=mase.propertyId
            where p.id in (${exceptionPropertyList})`

            let itemCategoriesQuery = `
            select distinct av.*
            from MemorialAddOnSpec mas
            inner join AttributeValue av on av.id=mas.addOnTypeAttributeValueId
            where memorialTypeAttributeValueId=${memorialTypeId} ${sizeAttributeFilter}
            ${exceptionPropertyList.length ? `UNION ${exceptionItemCategoriesQuery}` : ''}
            `
            const itemCategories = await models.sequelize.query(itemCategoriesQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })
            return itemCategories
        } catch (error) {
            logger.log('error', error.message)
            throw error
        }
    }
    /**
     * Get list of properties which belongs in the garden spec memorial exception for an agreement.
     * @param {number} agreementId
     * @param {boolean} validation
     * @param {array} propertyIds
     * @param {number} memorialTypeId
     * @param {number} isSideBySide
     */
    async getMemorialSpecExceptionPropertyList (agreementId, validation = true, propertyIds = false, memorialTypeId = false, isSideBySide = false) {
        try {
            let propertyFilter = ''
            let memorialTypeFilter = ''
            let sideBySideFilter = ''
            let fetchQuery = `DISTINCT GardenSpecMemorialException.propertyId`

            if (propertyIds && propertyIds.length) {
                propertyFilter = `AND GardenSpecMemorialException.propertyId IN (${propertyIds})`
            }
            if (memorialTypeId) {
                memorialTypeFilter = `AND GardenSpecMemorialException.memorialTypeAttributeValueId IN (${memorialTypeId})`
            }
            if (isSideBySide === 0) {
                sideBySideFilter = `AND GardenSpecMemorialException.isSideBySideRule = ${isSideBySide}`
            } else if (isSideBySide === 1) {
                sideBySideFilter = `AND GardenSpecMemorialException.isSideBySideRule IN (0,${isSideBySide})`
            }
            if (!validation) {
                fetchQuery = `GardenSpecMemorialException.*`
            }
            let memorialSpecExceptionPropertyQuery = `
            SELECT ${fetchQuery}
            FROM GardenSpecMemorialException
            INNER JOIN Property ON Property.id = GardenSpecMemorialException.propertyId
            INNER JOIN AgreementProperty ON AgreementProperty.propertyId = Property.id
            WHERE AgreementProperty.agreementId =:agreementId
            AND AgreementProperty.reservationStatus = 'confirmed'
            AND AgreementProperty.deletedAt IS NULL
            AND AgreementProperty.deletedBy IS NULL
            ${propertyFilter}
            ${memorialTypeFilter}
            ${sideBySideFilter}
            `
            const memorialSpecExceptionProperties = await models.sequelize.query(memorialSpecExceptionPropertyQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId
                }
            })
            return memorialSpecExceptionProperties
        } catch (error) {
            logger.log('error', error.message)
            throw error
        }
    }

    /**
     * Get memorial items for the given monumentItemId and agreementId
     * * @param {number} monumentItemId
     * * @param {number} agreementId
     */
    static async getMemorialItems (monumentItemId, agreementId, propertyIds = null) {
        try {
            const monumentItemMemorialTypeAttributeValueId = await this.getMemorialAttributeValueId(monumentItemId, 'Memorial Type')
            const monumentItemMemorialSizeAttributeValueId = await this.getMemorialAttributeValueId(monumentItemId, 'Memorial Size')

            let result = {
                memorialDetails: {},
                memorialAddOns: {}
            }

            const itemCategories = await this.getItemCategoriesOfMemorial(lodash.get(monumentItemMemorialTypeAttributeValueId, 'id', null), lodash.get(monumentItemMemorialSizeAttributeValueId, 'id', null))
            await Promise.all(itemCategories.map(async itemCategory => {
                const monumentItemAttributeValueIds = await this.getMonumentItemMemorialSpecAttributeValueIds(lodash.get(monumentItemMemorialTypeAttributeValueId, 'id', null), lodash.get(monumentItemMemorialSizeAttributeValueId, 'id', null), itemCategory.name, propertyIds)
                const monumentItems = await this.getMonumentItemsOnCategory(monumentItemAttributeValueIds, itemCategory.name, agreementId)
                result.memorialDetails[itemCategory.name] = monumentItems
            }))

            const cemeteryItemController = new CemeteryItemController(agreementId)
            let memorialAddOnCategories
            let exceptionPropertyList
            let exceptionPropertyIds
            if (propertyIds) {
                exceptionPropertyList = await cemeteryItemController.getMemorialSpecExceptionPropertyList(agreementId, true, propertyIds)
            } else {
                const memorialProperties = await cemeteryItemController.getMemorialProperties()
                const propertyIds = memorialProperties.properties.map(prop => prop.id)
                exceptionPropertyList = await cemeteryItemController.getMemorialSpecExceptionPropertyList(agreementId, true, propertyIds)
            }
            exceptionPropertyIds = exceptionPropertyList.map(prop => prop.propertyId)
            memorialAddOnCategories = await this.getAttributeValuesOfMemorialAddOns(lodash.get(monumentItemMemorialTypeAttributeValueId, 'id', null), lodash.get(monumentItemMemorialSizeAttributeValueId, 'id', null), exceptionPropertyIds)

            await Promise.all(memorialAddOnCategories.map(async addOnType => {
                const memorialAddOnAttributeValueIds = await this.getMonumentItemMemorialSpecAttributeValueIds(lodash.get(monumentItemMemorialTypeAttributeValueId, 'id', null), lodash.get(monumentItemMemorialSizeAttributeValueId, 'id', null), 'Monument Add On', addOnType.name, exceptionPropertyIds)
                const monumentAddOnItems = await this.getMonumentItemsOnCategory(memorialAddOnAttributeValueIds, 'Monument Add On', agreementId)
                result.memorialAddOns[addOnType.name] = monumentAddOnItems
            }))

            return {
                success: true,
                data: result
            }
        } catch (err) {
            logger.log('error', err.message)
            throw err
        }
    }

    /**
     * Call this function to get the memorial types based on agreement id
     */
    async getMemorialCategories () {
        try {
            // Query to check if a agreement with the property exists
            const agreementCheckQuery = `SELECT * FROM AgreementProperty
            WHERE AgreementProperty.agreementId = ${this.agreementId}`
            const agreementCheck = await models.sequelize.query(agreementCheckQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })

            if (!agreementCheck.length) throw new Error('AGREEMENT_PROPERTY_NOT_FOUND')

            // Query to fetch the GardenSpecMemoral id, memorialTypeAttributeValueIds and memorialSizeAttributeValueIds for it's corresponding intermentRightsIds
            let hasSideBySideBit = 0
            const sidebysideProperties = await models.sequelize.query(`SELECT * FROM SideBySideProperty WHERE agreementId=${this.agreementId} and deletedAt IS NULL`, {
            })
            if (sidebysideProperties[0].length) {
                hasSideBySideBit = 1
            }

            // Query to fetch the intermentRightsIds for a particular agreement using agreementId
            const subQuery = `(
                SELECT IntermentRights.id FROM IntermentRights
                INNER JOIN PropertyType ON IntermentRights.propertyTypeId = PropertyType.id
                INNER JOIN PropertyTypeCode ON PropertyTypeCode.propertyTypeId = PropertyType.id
                INNER JOIN Property ON PropertyTypeCode.id = Property.propertyTypeCodeId
                INNER JOIN AgreementProperty ON Property.id = AgreementProperty.propertyId
                WHERE AgreementProperty.agreementId = ${this.agreementId} AND IntermentRights.propertyCampusId IN (
                    SELECT DISTINCT(PropertyCampus.Id) FROM AgreementProperty
                    INNER JOIN Property ON Property.id = AgreementProperty.propertyId
                    INNER JOIN PropertyGarden ON PropertyGarden.id = Property.propertyGardenId
                    INNER JOIN PropertyCampus ON PropertyCampus.id = PropertyGarden.propertyCampusId
                    WHERE AgreementProperty.agreementId = ${this.agreementId}
                    AND AgreementProperty.reservationStatus = 'confirmed'
                    AND AgreementProperty.deletedAt IS NULL
                    AND AgreementProperty.deletedBy IS NULL
                )
                AND AgreementProperty.reservationStatus = 'confirmed'
                AND AgreementProperty.deletedAt IS NULL
                AND AgreementProperty.deletedBy IS NULL
                AND IntermentRights.graves = (CASE WHEN PropertyType.name = 'Grave' AND ${hasSideBySideBit} = 0 THEN 1 ELSE IntermentRights.graves END )
            )`
            let memorialCategoriesQuery = `(SELECT GardenSpecMemorial.id, GardenSpecMemorial.memorialTypeAttributeValueId, GardenSpecMemorial.memorialSizeAttributeValueId
            FROM GardenSpecMemorial
            WHERE GardenSpecMemorial.intermentRightsId IN (${subQuery}))`

            let exceptionPropertyList = await this.getMemorialSpecExceptionPropertyList(this.agreementId, true)

            let allAgreementProperties = await this.getMemorialProperties()
            let propertyIds = allAgreementProperties.properties.map(prop => prop.id).sort()
            let exceptionPropertyIds = exceptionPropertyList.map(prop => prop.propertyId).sort()

            if (exceptionPropertyList && exceptionPropertyList.length) {
                let sideBySideFilter = 'AND GardenSpecMemorialException.isSideBySideRule = 0'
                if (allAgreementProperties.sideBySideProperties && allAgreementProperties.sideBySideProperties.length) {
                    sideBySideFilter = 'AND GardenSpecMemorialException.isSideBySideRule IN (0,1)'
                }
                let memorialGardenSpecExceptionQuery = `
                    SELECT GardenSpecMemorialException.id, GardenSpecMemorialException.memorialTypeAttributeValueId, GardenSpecMemorialException.memorialSizeAttributeValueId
                    FROM GardenSpecMemorialException
                    INNER JOIN Property ON Property.id = GardenSpecMemorialException.propertyId
                    INNER JOIN AgreementProperty ON AgreementProperty.propertyId = Property.id
                    WHERE AgreementProperty.agreementId = ${this.agreementId}
                    AND AgreementProperty.reservationStatus = 'confirmed'
                    AND AgreementProperty.deletedAt IS NULL
                    AND AgreementProperty.deletedBy IS NULL
                    ${sideBySideFilter}
                `
                if (propertyIds.length > 0 && exceptionPropertyIds.length > 0 && lodash.isEqual(propertyIds, exceptionPropertyIds)) {
                    memorialCategoriesQuery = memorialGardenSpecExceptionQuery
                } else {
                    memorialCategoriesQuery = memorialCategoriesQuery.concat(
                        ` UNION
                        (${memorialGardenSpecExceptionQuery})`
                    )
                }
            }

            // Query to fetch unique GardenSpecMemorial memorialTypeAttributeValueIds from the above query
            let memorialTypesQuery = `SELECT DISTINCT(gsm.memorialTypeAttributeValueId) FROM (${memorialCategoriesQuery}) gsm WHERE gsm.memorialTypeAttributeValueId IS NOT NULL`
            const result = await models.sequelize.query(memorialTypesQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })

            let memorialCategories = await this.getMemorialCategoriesValues(result, memorialCategoriesQuery)
            let isException = (propertyIds.length > 0 && exceptionPropertyIds.length > 0 && !lodash.isEqual(propertyIds, exceptionPropertyIds))
            return {
                success: true,
                data: memorialCategories,
                isException
            }
        } catch (err) {
            logger.log('error', err.message)
            throw err
        }
    }

    /**
     * this method returns all the properties and sideBySide properties of an agreement
     */
    async getMemorialProperties () {
        try {
            let memorialProperties = {}

            const sideBySidePropertiesQuery = `select * from SideBySideProperty sbsp
            where sbsp.deletedAt is null and sbsp.agreementId=:agreementId`

            const sideBySideProperties = await models.sequelize.query(sideBySidePropertiesQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId
                }
            })

            await Promise.all(sideBySideProperties.map(async (prop, index) => {
                const propertiesQuery = `select p.* from AgreementProperty ap inner join Property p on ap.propertyId=p.id where ap.id=${prop.leftAgreementPropertyId} or ap.id=${prop.rightAgreementPropertyId}`
                const properties = await models.sequelize.query(propertiesQuery, {
                    type: models.sequelize.QueryTypes.SELECT
                })
                sideBySideProperties[index].properties = properties
            }))
            memorialProperties.sideBySideProperties = sideBySideProperties
            let agreementProperties = []
            const agreementPropertiesQuery = `select p.*, pt.name as propertyTypeName  from Agreement a
                INNER JOIN AgreementProperty ap on a.id= ap.agreementId
                INNER JOIN Property p on p.id=ap.propertyId
                INNER JOIN PropertyGarden pg ON pg.id = p.propertyGardenId
                INNER JOIN PropertyCampus pc ON pc.id = pg.propertyCampusId
                INNER JOIN PropertyTypeCode ptc ON ptc.id = p.propertyTypeCodeId
                INNER JOIN PropertyType pt ON pt.id = ptc.propertyTypeId
                where ap.agreementId =${this.agreementId} and ap.deletedAt is null and ap.deletedBy is null and ap.reservationStatus = 'confirmed'
               `

            agreementProperties = await models.sequelize.query(agreementPropertiesQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })
            memorialProperties.properties = agreementProperties

            return memorialProperties
        } catch (error) {
            throw error
        }
    }
}

module.exports = CemeteryItemController
