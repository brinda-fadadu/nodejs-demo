
const models = require('../models/index')
const moment = require('moment')

function getStatusIds () {
    return models.Status.findAll({})
}

async function getUsersList (role, type) {
    let users
    if (role) {
        users = await models.User.findAll({
            include: [{
                model: models.UserRole,
                where: { name: role },
                as: 'UserPermissions'
            }]
        })
    } else {
        users = await models.User.findAll({
            attributes: ['name', 'ldapId', 'id']
        })
    }
    let usersList = users.map(user => {
        return {
            Name: user.name, // TODO: change Name to name. -- Veena
            email: user.email,
            id: user.id
        }
    })
    if (type === 'list') {
        return usersList
    }
    let usersIds = users.map(user => {
        return Number(user.id)
    })
    return usersIds
}

async function getRelationIds () {
    let relations
    try {
        relations = await models.Relation.findAll({
            attributes: ['id']
        })
        let relationsIds = relations.map(e => {
            return Number(e.id)
        })
        return relationsIds
    } catch (error) {
        throw error
    }
}

async function getLanguageIds () {
    let languages
    languages = await models.Language.findAll({
        attributes: ['id']
    })
    let languagesIds = languages.map(e => {
        return Number(e.id)
    })
    return languagesIds
}

async function getOrganizationIds () {
    let organizations
    organizations = await models.Organization.findAll({
        attributes: ['id']
    })
    let organizationsIds = organizations.map(e => {
        return Number(e.id)
    })
    return organizationsIds
}

async function getOrganizationTypeIds () {
    let organizationsTypes
    organizationsTypes = await models.OrganizationType.findAll({
        attributes: ['id']
    })
    let organizationsTypeIds = organizationsTypes.map(e => {
        return Number(e.id)
    })
    return organizationsTypeIds
}

async function getAddressIds () {
    let addressTypes
    try {
        addressTypes = await models.AddressType.findAll({
            attributes: ['id']
        })
        let addressTypeIds = addressTypes.map(e => {
            return Number(e.id)
        })
        return {
            addressTypeIds: addressTypeIds
        }
    } catch (error) {
        return error
    }
}
async function getMemorialTypes () {
    let memorialRestorationTypes
    memorialRestorationTypes = await models.MemorialRestorationType.findAll({
        attributes: ['id']
    })
    let memorialRestorationTypesIds = memorialRestorationTypes.map(e => {
        return Number(e.id)
    })
    return memorialRestorationTypesIds
}

async function getFollowUpTypeIds () {
    let followUpTypes
    followUpTypes = await models.FollowUpType.findAll({
        attributes: ['id']
    })
    let followUpTypeIds = followUpTypes.map(e => {
        return Number(e.id)
    })
    return followUpTypeIds
}

async function getLocationIds (transaction) {
    let locations
    locations = await models.Location.findAll({
        attributes: ['id'],
        transaction
    })
    let locationIds = locations.map(e => {
        return Number(e.id)
    })
    return locationIds
}

async function getMaintenanceTypeIds () {
    let maintenanceCauses
    maintenanceCauses = await models.MaintenanceCause.findAll({
        attributes: ['id']
    })
    let maintenanceTypeIds = maintenanceCauses.map(e => {
        return Number(e.id)
    })
    return maintenanceTypeIds
}

async function getNoteCategories () {
    let categories
    categories = await models.NoteCategory.findAll({
        attributes: ['id']
    })
    let categoryIds = categories.map(e => {
        return Number(e.id)
    })
    return categoryIds
}

async function getCallIds () {
    let calls
    calls = await models.Call.findAll({
        attributes: ['id']
    })
    let callIds = calls.map(e => {
        return Number(e.id)
    })
    return callIds
}

async function getGenealogyCallIds () {
    let calls
    calls = await models.Call.findAll({
        where: { reasonId: 5 },
        attributes: ['id']
    })
    let callIds = calls.map(e => {
        return Number(e.id)
    })
    return callIds
}

async function getCallReason (callId) {
    let call = await models.Call.findOne({
        where: { id: callId }
    })
    return call.reasonId
}

async function getMaintenanceCallIds () {
    let calls
    calls = await models.Call.findAll({
        where: { reasonId: 3 },
        attributes: ['id']
    })
    let callIds = calls.map(e => {
        return Number(e.id)
    })
    return callIds
}

async function getTicketIds () {
    let tickets
    tickets = await models.Ticket.findAll({
        attributes: ['ticketId']
    })
    let ticketIds = tickets.map(e => {
        return e.ticketId
    })
    return ticketIds
}

async function getCaseRoleIdsOnContactType (contactType) {
    let roles
    try {
        roles = await models.ContactTypeRole.findAll({
            attributes: ['roleId'],
            where: {
                ContactType: contactType
            }
        })
        let roleIds = roles.map(e => {
            return e.roleId
        })
        return roleIds
    } catch (error) {
        throw error
    }
}

async function getMaritalStatuses () {
    let maritalStatuses = await models.MaritalStatus.findAll({
        attributes: ['id']
    })
    let maritalStatusIds = maritalStatuses.map(e => {
        return Number(e.id)
    })
    return maritalStatusIds
}

async function generateOnePortalId () {
    let date = moment().format('YYYY-MM-DD')
    date = date.replace(/[^\w\s]/gi, '')

    let timeStamp = moment()
        .toDate()
        .getTime()
    timeStamp = timeStamp.toString()
    timeStamp = timeStamp.substr(timeStamp.length - 6)

    let uniqueOnePortalId = `CS-${date}-${timeStamp}`
    return uniqueOnePortalId
}

function generateCallIdentifier () {
    return 'CLC-' + new Date().getTime().toString().slice(-6)
}

function JsonArrayToJson (data, key, value) {
    let jsonObj = {}
    data.forEach(ele => {
        jsonObj[ele[key]] = ele[value]
    })
    return jsonObj
}

async function getZip (addressData) {
    let zipcode
    try {
        let query = {}
        if (addressData.city) {
            query.CityId = addressData.city
        }
        if (addressData.state) {
            query.StateId = addressData.state
        }
        if (addressData.county) {
            query.CountyId = addressData.county
        }
        if (addressData.country) {
            query.CountryId = addressData.country
        }
        zipcode = await models.Zipcode.findAll({
            where: query,
            attributes: ['Code']
        })
        let zipcodes = zipcode.map(e => {
            return e.Code
        })

        return {
            zipcodes: zipcodes
        }
    } catch (error) {
        return error
    }
}

async function getEmployees (types) {
    try {
        let whereObject = {}
        if (types) {
            whereObject.employeeTypeId = types
        }
        const employees = await models.Employee.findAll({
            attributes: ['id'],
            where: whereObject
        })
        return employees.map(employee => employee.id)
    } catch (error) {
        return error
    }
}

async function getEmployeeTypeId (description) {
    const employeeTypeId = await models.EmployeeType.findOne({
        where: {
            description: description
        }
    })
    return employeeTypeId.id
}

async function getConfigValue (configName) {
    const configDate = await models.Config.findOne({
        attributes: ['configValue'],
        where: {
            configName: configName
        }
    })
    return configDate.configValue
}

module.exports = {
    getUsersList,
    getRelationIds,
    getLanguageIds,
    getOrganizationIds,
    getOrganizationTypeIds,
    getAddressIds,
    getFollowUpTypeIds,
    getLocationIds,
    getMaintenanceTypeIds,
    getMemorialTypes,
    getNoteCategories,
    getCallIds,
    getGenealogyCallIds,
    getMaintenanceCallIds,
    getTicketIds,
    getMaritalStatuses,
    generateOnePortalId,
    getCaseRoleIdsOnContactType,
    JsonArrayToJson,
    getZip,
    getEmployees,
    getStatusIds,
    getCallReason,
    getEmployeeTypeId,
    generateCallIdentifier,
    getConfigValue
}
