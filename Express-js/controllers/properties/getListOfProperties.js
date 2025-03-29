const models = require('../../models/index')
const logger = require('../../lib/logger')

async function fetchListOfPropertyTypes (query) {
    let limit = query.limit || 25
    let offset = query.page ? (Number(query.page) - 1) * limit : 0
    let filteringConditions = `stmtProps.reservationStatus IS NULL`
    if (query.statementId) {
        filteringConditions = `(stmtProps.reservationStatus IS NULL OR (stmtProps.statementId=${query.statementId} AND stmtProps.reservationStatus='reserved'))`
    }
    if (query.propertyTypeId) {
        let propertyTypeIds = query.propertyTypeId.map(a => Number(a))
        filteringConditions = filteringConditions + ` AND props.propertyTypeCodeId IN (${propertyTypeIds.join(', ')})`
    }
    if (query.propertyCampusId) {
        filteringConditions = filteringConditions + ` AND pg.propertyCampusId = ${query.propertyCampusId}`
    }
    if (query.propertyGardenId) {
        let propertyGardenIds = query.propertyGardenId.map(a => Number(a))
        filteringConditions = filteringConditions + ` AND props.propertyGardenId IN (${propertyGardenIds.join(', ')})`
    }
    // if (query.maxRights) {
    //     filteringConditions = filteringConditions + ` AND int_rights.maxRights = ${query.maxRights}`
    // }
    if (query.minPrice) {
        filteringConditions = filteringConditions + ` AND props.total >= ${query.minPrice}`
    }
    if (query.maxPrice) {
        filteringConditions = filteringConditions + ` AND props.total <= ${query.maxPrice}`
    }
    try {
        const selections = `
            props.id,
            props.propertyName,
            props.price,
            props.ecfAmount,
            props.total,
            props.propertyItemCode,
            props.lotSellUnitId,
            pc.name AS propertyCampus,
            pg.name AS propertyGarden,
            stmtProps.reservationStatus,
            0 AS maxRights,
            0 AS rights
        `

        const buildQuery = (selections) => `
            SELECT
            ${selections}
            FROM
            [Property] AS props
            INNER JOIN [PropertyGarden] AS pg ON pg.id = props.propertyGardenId
            INNER JOIN [PropertyCampus] AS pc ON pc.id = pg.propertyCampusId
            INNER JOIN [PropertyType] AS pt ON pt.id = props.propertyTypeCodeId
            LEFT OUTER JOIN [StatementProperty] AS stmtProps ON stmtProps.propertyId = props.id
            WHERE
            ${filteringConditions}
        `
        const result = await models.sequelize.query(`
            ${buildQuery(selections)}
            ORDER BY props.id
            OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
        `)

        const metaQuery = await models.sequelize.query(`
            ${buildQuery('COUNT(props.id) AS count')}
        `)

        return {
            properties: result[0],
            meta: metaQuery[0][0].count
        }
    } catch (error) {
        let errorMessage = error.message || error
        logger.error(errorMessage)
        throw errorMessage
    }
}

module.exports = exports = fetchListOfPropertyTypes
