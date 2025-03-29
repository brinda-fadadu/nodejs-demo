const models = require('../../models/index')
const _ = require('lodash')
const Op = require('sequelize').Op
const fs = require('fs')
const util = require('util')
const esClient = require('../../config/elastic-config')
const { getLocationIds } = require('../../utils/dbGetFunctions')
const UploadFileController = require('./uploadFileController/uploadFileController')
const realpath = util.promisify(fs.realpath)
const { propertyDiscounts } = require('../../utils/constants')

async function upsert (model, payload, transaction, context = {}) {
    try {
        const id = _.get(payload, 'id')
        let instance
        // TODO: We should not change the source paramter.
        if (payload.toJSON) {
            payload = payload.toJSON()
        }

        payload.updatedBy = context.userId || payload.userId
        payload.updatedAt = new Date()
        if (id) {
            /* Check if the id is correct */
            instance = await models[model].findOne({
                where: { id },
                transaction
            })
            if (!instance) {
                throw new Error('Record not found')
            }
            /* Update if the id is correct */
            instance.set(payload)
            instance = await instance.save({ transaction })
            if (context.afterUpdate) {
                /* hook signature expected: afterUpdate(instance, { transaction }) */
                await context.afterUpdate(instance, { transaction })
            }
        } else {
            /* Create new record in the DB */
            payload.createdBy = context.userId || payload.userId
            payload.createdAt = new Date()
            instance = await models[model].create(payload, { transaction })
            if (context.afterCreate) {
                await context.afterCreate(instance, { transaction })
            }
        }
        /* Return entire object */
        return instance
    } catch (error) {
        console.log(error)
        throw error
    }
}

async function getContactRoles (contactType, roles, format, transaction) {
    let whereObj = {
        contactType: contactType
    }
    if (roles.length > 0) {
        whereObj.name = {
            [Op.in]: roles
        }
    }
    const contactRoles = await models.ContactRole.findAll({
        where: whereObj,
        transaction
    })
    switch (format) {
    case 'map':
        let rolesObj = {}
        contactRoles.forEach(ele => {
            rolesObj[ele.name] = ele.id
        })
        return rolesObj
    case 'array':
        return contactRoles.map((e) => e.id)
    case 'contactRoleNames':
        return contactRoles.map((e) => e.name)
    default:
        return contactRoles.map((e) => e.id)
    }
}

async function getRelations (format) {
    try {
        const relations = await models.Relation.findAll({})
        switch (format) {
        case 'map':
            let relationsObj = {}
            relations.forEach((e) => {
                relationsObj[e.name] = e.id
            })
            return relationsObj
        case 'array':
            return relations.map((e) => e.id)
        default:
            return relations.map((e) => e.id)
        }
    } catch (error) {
        return error
    }
}
async function fetchSingleInstanceFromES (indexName, id) {
    return esClient.search({
        index: indexName,
        body: {
            query: {
                bool: {
                    must: [
                        {
                            term: {
                                id
                            }
                        }
                    ]
                }
            },
            size: 1
        }
    })
}

function getQueriableValues (valuesArray) {
    try {
        if (valuesArray.length) {
            let stringifiedValues = '(' + valuesArray.join(', ') + ')'
            return stringifiedValues
        }
    } catch (err) {
        throw err
    }
}

async function getAgreementRoles (format, transaction) {
    const roles = await models.AgreementRole.findAll({
        transaction
    })
    switch (format) {
    case 'map':
        let rolesObj = {}
        roles.forEach(ele => {
            rolesObj[ele.name] = ele.id
        })
        return rolesObj
    case 'array':
        return roles.map((e) => e.id)

    default:
        return roles.map((e) => e.id)
    }
}

async function validateLocationIds (locationId, transaction) {
    const locationIds = await getLocationIds(transaction)
    if (!locationIds.includes(locationId)) {
        throw new Error('INVALID_LOCATION_ID')
    }
}

function paymentDetailsQuery (agreementId, payorId) {
    return (
        `SELECT 
        agreementTotal.price,
        COALESCE(payments.total,0) AS totalPayments,
        agreementTotal.price - COALESCE(payments.total,0) AS payable
        FROM (
            SELECT
            SUM(agmtItem.price) AS price
            FROM
            Agreement AS agmt
            INNER JOIN 
                AgreementItem AS agmtItem
            ON 
                agmtItem.agreementId = agmt.id
                AND agmtItem.parentId IS NULL  
            WHERE agmt.id = ${agreementId}
            GROUP BY agmt.id
        ) AS agreementTotal
        LEFT OUTER JOIN (
            SELECT
            SUM(pymt.amount) AS total
            FROM
            Agreement AS agmt
            INNER JOIN 
                Payment AS pymt
            ON 
                pymt.resourceId = agmt.id 
                AND pymt.resourceType = 'Agreement'
                ${payorId ? 'AND pymt.payorId=' + payorId : ''}
            WHERE agmt.id = ${agreementId}
            GROUP BY agmt.id
        ) AS payments
        ON 1 = 1`
    )
}

function getFullNameOfPerson (person) {
    const personDetails = []
    personDetails.push(_.get(person, 'prefix'))
    personDetails.push(_.get(person, 'firstName'))
    personDetails.push(_.get(person, 'middleName'))
    personDetails.push(_.get(person, 'lastName'))
    return personDetails.join(' ')
}

function removePrefix (nameStr) {
    return nameStr.replace(/(Mr|Miss|Mrs)(\.?)\s/, '')
}

async function fetchLocationsList (transaction) {
    const locations = await models.Location.findAll({
        transaction
    })
    const locationsObj = {}
    locations.forEach(ele => {
        locationsObj[ele.code] = ele.id
    })
    return locationsObj
}

async function fetchAssignedToIds (id, transaction) {
    const assignedToIds = await models.CallAssignment.findAll({
        where: { callId: id },
        transaction
    })
    const newAssignedToIds = assignedToIds.map(e => e.assignedToId)
    return newAssignedToIds
}

async function convertToJson (obj) {
    _.forOwn(obj, (value, key) => {
        try {
            obj[key] = value !== '{}' ? JSON.parse(value) : null
        } catch (e) { }
    })
    return obj
}

async function convertToJsonRecursive (obj) {
    if (!isObject(obj)) {
        return obj
    } else {
        _.forOwn(obj, (value, key) => {
            try {
                obj[key] = value !== '{}' ? JSON.parse(value) : null
                if (isObject(obj[key])) {
                    convertToJsonRecursive(obj[key])
                }
            } catch (e) { }
        })
        return obj
    }
}

function isObject (obj) {
    if ((typeof obj === 'object' || typeof obj === 'function') && (obj !== null)) {
        return true
    } return false
}

async function commonDownloadFileWithSignature (data, url) {
    const uploadFileController = new UploadFileController()
    let originalUrl = data && data.originalFileName ? data.originalFileName : null
    let value = await uploadFileController.downloadFileWithSignature(originalUrl, url)
    return value
}

function getPropertyDiscounts (propertyDiscounts) {
    let propertyPreApplyDiscountsStr = propertyDiscounts.join("','")
    return `'${propertyPreApplyDiscountsStr}'`
}

async function getNetPropertyPrice (agreementObj, transaction) {
    const { agreementId, addendumId } = agreementObj
    // Total price and Total ECF Amount of properties including additional rights
    let totalPriceOfAgreementProperties = await models.sequelize.query(`SELECT SUM (A.totalPrice) AS totalPrice, SUM (A.ecfAmount) AS ecfAmount FROM(SELECT ISNULL(SUM(aip.totalPrice), 0) AS totalPrice, ISNULL(SUM(aip.totalECFAmount), 0) AS ecfAmount FROM AgreementProperty ap
    INNER JOIN AgreementItemPrice aip ON aip.id = ap.agreementItemPriceId
    -- INNER JOIN Property p ON p.id = ap.propertyId
    WHERE ap.agreementId= :agreementId
    ${addendumId ? 'AND ap.addendumId= :addendumId' : ''}
    AND ap.reservationStatus= 'confirmed' 
    AND ap.deletedAt IS NULL AND ap.deletedBy IS NULL GROUP BY ap.agreementId UNION SELECT ISNULL(SUM(aip.totalPrice), 0) AS totalPrice, 0 AS ecfAmount FROM AgreementPropertyAdditionalRight apar
    INNER JOIN AgreementItemPrice aip ON aip.id = apar.agreementItemPriceId
WHERE apar.agreementId= :agreementId ${addendumId ? 'AND apar.addendumId= :addendumId' : ''}
AND apar.deletedAt IS NULL AND apar.deletedBy IS NULL) AS A`, {
        type: models.sequelize.QueryTypes.SELECT,
        replacements: {
            agreementId,
            addendumId
        },
        transaction
    })

    // Total price of discounts like 'PN Discount', 'Pn Property Discount', 'Predeveloped Discount', 'Paid in Full Discount', 'Automatic Payment Discount', 'Finance Discount'
    let totalPriceOfAgreementPropertiesAdjustments = await models.sequelize.query(`SELECT ISNULL(SUM(AD.amount), 0) AS totalPrice FROM AgreementAdjustment AD
    INNER JOIN Adjustment A ON AD.AdjustmentId=A.id WHERE 
    A.title IN (${getPropertyDiscounts(propertyDiscounts)}) AND AD.deletedAt IS NULL AND AD.deletedBy IS NULL AND AD.agreementId= :agreementId ${addendumId ? 'AND AD.addendumId= :addendumId' : ''}`, {
        type: models.sequelize.QueryTypes.SELECT,
        replacements: {
            agreementId,
            addendumId
        },
        transaction
    })

    // Total price of property related promo codes
    let totalAgreementAdjustments = await models.sequelize.query(`SELECT * FROM AdjustmentAgreementSection WHERE adjustmentId IN (SELECT adjustmentId FROM AgreementAdjustment WHERE agreementId= :agreementId ${addendumId ? 'AND addendumId= :addendumId' : ''} AND deletedby IS NULL)`, {
        type: models.sequelize.QueryTypes.SELECT,
        replacements: {
            agreementId,
            addendumId
        },
        transaction
    })

    let propertyPromoCodesSum = 0
    if (totalAgreementAdjustments.length > 0) {
        let totalPriceOfAgreementPropertiesAdjustmentsPromoCodes
        const res = {}
        totalAgreementAdjustments.length && totalAgreementAdjustments.forEach(obj => {
            const key = `${obj.adjustmentId}`
            if (!res[key]) {
                res[key] = { ...obj, count: 0 }
            }
            res[key].count += 1
        })
        const countTheDuplicates = Object.values(res)
        let filterWithSingleCountitem = countTheDuplicates.length && countTheDuplicates.filter(
            item => {
                return item.count === 1
            }
        )

        let getPropertySectionId = await models.sequelize.query(`SELECT id from AgreementSection WHERE area = 'Property'`, {
            type: models.sequelize.QueryTypes.SELECT,
            transaction
        })

        for (let item of filterWithSingleCountitem) {
            let obj = totalAgreementAdjustments.find(o => o.id === item.id)
            if (obj.agreementSectionId === getPropertySectionId[0].id) {
                totalPriceOfAgreementPropertiesAdjustmentsPromoCodes = await models.sequelize.query(`SELECT * FROM AgreementAdjustment WHERE adjustmentId= :adjustmentId AND agreementId= :agreementId ${addendumId ? 'AND addendumId= :addendumId' : ''} AND deletedby IS NULL`, {
                    type: models.sequelize.QueryTypes.SELECT,
                    replacements: {
                        adjustmentId: obj.adjustmentId,
                        agreementId: agreementId,
                        addendumId: addendumId
                    },
                    transaction
                })
                propertyPromoCodesSum = propertyPromoCodesSum + _.get(totalPriceOfAgreementPropertiesAdjustmentsPromoCodes, '[0].amount', 0)
            }
        }
    }

    const netPropertyPriceWithoutECF = _.get(totalPriceOfAgreementProperties, '[0].totalPrice', 0) - _.get(totalPriceOfAgreementPropertiesAdjustments, '[0].totalPrice', 0) - propertyPromoCodesSum
    const netPropertyPriceWithECF = netPropertyPriceWithoutECF + _.get(totalPriceOfAgreementProperties, '[0].ecfAmount', 0)

    return {
        netPropertyPriceWithoutECF,
        netPropertyPriceWithECF
    }
}

async function certificateOfSepulcherCondition (agreementId, totalPaid, transaction) {
    let agreementTotalPaid = totalPaid
    if (!totalPaid) {
        let agreement = await models.Agreement.findOne({
            attributes: ['totalPaid'],
            where: {
                id: agreementId
            },
            transaction
        })
        agreementTotalPaid = _.get(agreement, 'totalPaid')
    }

    let propertyNetPrice = await getNetPropertyPrice({
        agreementId: agreementId
    }, transaction)

    return agreementTotalPaid >= propertyNetPrice.netPropertyPriceWithECF.toFixed(2)
}

async function getAssetsPathForCertOfSepulcher () {
    const clWaterMarkBg = fs.readFileSync(await realpath('./public/water-mark-bg.png'), { encoding: 'base64' })
    const raySign = fs.readFileSync(await realpath('./public/ray.png'), { encoding: 'base64' })
    const bobSign = fs.readFileSync(await realpath('./public/bob.png'), { encoding: 'base64' })
    const footerLogo = fs.readFileSync(await realpath('./public/footer-logo.jpg'), { encoding: 'base64' })
    const stamp = fs.readFileSync(await realpath('./public/stamp.jpg'), { encoding: 'base64' })
    const clLogo = fs.readFileSync(await realpath('./public/clLogo.png'), { encoding: 'base64' })

    return {
        clWaterMarkBg,
        raySign,
        bobSign,
        footerLogo,
        stamp,
        clLogo
    }
}

// function is used to check table is exist or not before do query with table
async function isTableExist (table) {
    try {
        await models.sequelize.query(`select count(*) from ${table}`, {
            type: models.sequelize.QueryTypes.SELECT
        })
        return true
    } catch (error) {
        return false
    }
}

module.exports = exports = {
    upsert,
    getContactRoles,
    getRelations,
    fetchSingleInstanceFromES,
    getQueriableValues,
    getAgreementRoles,
    validateLocationIds,
    getFullNameOfPerson,
    paymentDetailsQuery,
    removePrefix,
    fetchLocationsList,
    fetchAssignedToIds,
    convertToJson,
    convertToJsonRecursive,
    commonDownloadFileWithSignature,
    certificateOfSepulcherCondition,
    getAssetsPathForCertOfSepulcher,
    getNetPropertyPrice,
    getPropertyDiscounts,
    isTableExist
}
