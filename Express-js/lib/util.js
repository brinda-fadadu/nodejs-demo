const _ = require('underscore')

async function asyncForEach (dataArray, callback) {
    for (let i = 0; i < dataArray.length; i++) {
        await callback(dataArray[i], i, dataArray)
    }
}

function getNameOfPerson (firstName, middleName, lastName) {
    const name = [firstName, middleName, lastName].filter(v => v).join(' ')
    return name
}

function getKey (json, valueToFind) {
    let key = _.findKey(json, function (value, key) {
        return value === valueToFind
    })
    return key
}

async function getRoleIdsForStatements () {
    const models = require('../models')

    let rolesRes = {}
    try {
        const roles = await models.Role.findAll({
            where: {
                name: ['Purchaser', 'Co-purchaser', 'Beneficiary', 'Decedent'],
                type: 'Agreement'
            }
        })
        roles.forEach(ele => {
            rolesRes[ele.name] = ele.id
        })
        return rolesRes
    } catch (error) {
        return error
    }
}

function getPrice (price) {
    let formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        signDisplay: 'never'
    })
    let dollarPrice = '0.00'
    if (price || price === 0) {
        dollarPrice = `${Math.abs(price)}`
    }
    return price >= 0 ? formatter.format(dollarPrice).substring(1) : `-${formatter.format(dollarPrice).substring(1)}`
};

function getPriceWithDecimial (values) {
    return getPrice(Number.parseFloat(values).toFixed(2))
}

const bullJobRetry = {
    attempts: 3,
    backoff: 50000,
    timeout: 300000,
    removeOnComplete: true
}

function getQueryObject (whereCondition, attributes, includes, order) {
    let queryObject = {
        where: whereCondition,
        attributes: attributes,
        include: includes
    }
    if (whereCondition) {
        queryObject.where = whereCondition
    }
    if (attributes) {
        queryObject.attributes = attributes
    }
    if (includes) {
        queryObject.include = includes
    }
    if (order) {
        queryObject.order = order
    }
    return queryObject
}

/**
 * This method gets all the case info forms that belongs to a person
 * @param {*} model ,ex: model.Form
 * @param {*} as model alias
 * @param {*} isRequired should be null or should have true or false
 * @param {*} attributes array of column names
 * @param {*} whereCondition condition object
 * @param {*} includes array object
 */
function getModel (model, as, isRequired, attributes, whereCondition, includes) {
    let modelObject = {
        model: model
    }
    if (whereCondition) {
        modelObject.where = whereCondition
    }
    if (as) {
        modelObject.as = as
    }
    if (includes && Array.isArray(includes)) {
        modelObject.include = includes
    }
    if (isRequired !== null) {
        modelObject.required = isRequired
    }
    if (attributes) {
        modelObject.attributes = attributes
    }
    return modelObject
}

exports.asyncForEach = asyncForEach
exports.getNameOfPerson = getNameOfPerson
exports.getKey = getKey
exports.getRoleIdsForStatements = getRoleIdsForStatements
exports.bullJobRetry = bullJobRetry
exports.getQueryObject = getQueryObject
exports.getModel = getModel
exports.getPriceWithDecimial = getPriceWithDecimial
