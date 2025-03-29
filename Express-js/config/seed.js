const _ = require('underscore')

const seed = {
    'CallReasons': {
        1: 'Someone has Passed',
        2: 'Interested in Pre-Arrangement',
        3: 'Maintenance Request',
        4: 'Memorial Restoration',
        5: 'Genealogy Search',
        6: 'Other Inquiry'
    },
    'CallStatus': {
        1: 'No Contact',
        2: 'Converted',
        3: 'Contact - Left message',
        4: 'Pending Appointment',
        5: 'Appointment set',
        6: 'Follow up required',
        7: 'Completed - No Contact',
        8: 'Completed - Contact ; Left Message',
        9: 'Completed - Follow up needed',
        10: 'Completed - Call closed',
        11: 'Lost - Selected other Facilities',
        12: 'Lost - No Contact',
        13: 'Lost - PN-AN Change of Facilities'
    },
    'CallReceivedLocations': {
        1: 'Zxc, Colma',
        2: 'Crosby N. Gray',
        3: 'Burlingame',
        4: 'All County Cremation Service',
        5: 'Sneider & Sullivan',
        6: 'Miller Dutra'
    },
    'LocationsOfReamins': {
        1: 'Zxc, Colma',
        2: 'Crosby N.Gray'
    },
    'Type': {
        1: 'Call',
        2: 'WalkIn'
    },
    'ServiceType': {
        1: 'Funeral',
        2: 'Cemetery',
        3: 'Travel Protection'
    },
    'ArrangementType': {
        1: 'AN',
        2: 'PN',
        3: 'PN Turn AN'
    },
    // TICKET SEEDERS
    'TicketStatus': {
        1: 'Open',
        2: 'Inprogress',
        3: 'Closed',
        4: 'Decline',
        5: 'OverDue',
        6: 'Archive'
    },
    'TicketPriority': {
        1: 'High',
        2: 'Medium',
        3: 'Low'
    },
    'MaintenanceTypes': {
        1: 'Monument & Marker',
        2: 'Mowing & Trimming',
        3: 'Plants & Trees',
        4: 'Sod',
        5: 'Pesticides',
        6: 'Ground',
        7: 'Loose Crypt or Niche Plate',
        8: 'Vase',
        9: 'Missing Item (Memento)',
        10: 'Other'
    },
    // Anremainsinfotransfer seeders
    'TransferType': {
        1: 'Transfer In',
        2: 'Transfer Out',
        3: 'Crematory',
        4: 'Ship Out',
        5: 'Ship In',
        6: 'Other In'
    },
    // agreement type  is contract type
    'ContractType': {
        1: 'FUNERAL',
        2: 'CEMETRY',
        3: 'BOTH',
        4: 'WHOLESALE CREMATION',
        5: 'Miscellaneous Sales'
    },
    'AdjustmentType': {
        1: 'PromoDiscount',
        2: 'OtherDiscount',
        3: 'Adjustment'
    },
    'AgreementSection': {
        1: 'Contract',
        2: 'Merchandise',
        3: 'Package',
        4: 'Property',
        5: 'CashAdvancedItem',
        6: 'SpecialOrderItem',
        7: 'Services'
    },
    'TransferLocationTypes': {
        1: 'Location',
        2: 'Organization',
        3: 'Residence'
    },
    'ContactType': {
        1: 'Family',
        2: 'Staff',
        3: 'Others'
    },
    'promoCodeApplicableTo': [
        'Statement',
        'Contract',
        'Merchandise',
        'Services',
        'Property'
    ],
    'discountUnit': [
        '%',
        '$'
    ],
    'Gender': {
        1: 'Female',
        2: 'Male',
        3: 'Other'
    },
    'PaymentTypes': {
        1: 'Cash',
        2: 'Check',
        3: 'Money order',
        4: 'Card',
        5: 'Anticipated payment',
        6: 'Email Request',
        7: 'Void Check'
    },
    'UrnTransferStatus': {
        1: 'Open',
        2: 'Completed'
    }
}

const CallReasons = {
    'AtNeed': 1,
    'PreNeed': 2,
    'MaintenanceRequest': 3,
    'MemorialRestoration': 4,
    'GeneologySearch': 5,
    'OtherInquiry': 6
}

const propertyTypeMappings = {
    'Companion Grave': 'Single Grave',
    'Single Space': 'Single Grave',
    'Grave': 'Single Grave',
    'Crypt': 'Crypt',
    'Sarcophagus': 'Crypt',
    'Tomb Room': 'Crypt',
    'Crypt - Couch': 'Crypt',
    'Crypt - Single': 'Crypt',
    'Crypt - Double': 'Crypt',
    'Crypt - Deluxe Companion': 'Crypt',
    'Crypt - Deluxe Companion Westminster': 'Crypt',
    'Crypt - Quad': 'Crypt',
    'Crypt - Quad Westminster': 'Crypt',
    'Crypt - Tandem': 'Crypt',
    'Crypt - Tandem Westminster': 'Crypt',
    'Crypt Westminster': 'Crypt',
    'Crypt - Westminster': 'Crypt',
    'DD Lawn Crypt': 'Lawn Crypt',
    'Cremorial': 'Niche',
    'Niche': 'Niche',
    'Crypt Niche': 'Niche',
    'Estate': 'Estate',
    'Cremation Estate': 'Estate',
    'Stone Estate 1 Plot': 'Estate',
    'Stone Estate 10 Plots': 'Estate',
    'Stone Estate 2 Plots': 'Estate',
    'Stone Estate 3 Plots': 'Estate',
    'Stone Estate 4 Plots': 'Estate',
    'Stone Estate 5 Plots': 'Estate',
    'Stone Estate 6 Plots': 'Estate',
    'Stone Estate 7 Plots': 'Estate',
    'Stone Estate 8 Plots': 'Estate',
    'Granite Estate 1 Plot': 'Estate',
    'Granite Estate 2 Plots': 'Estate',
    'Granite Estate 3 Plots': 'Estate',
    'Granite Estate 4 Plots': 'Estate',
    'Granite Estate 5 Plots': 'Estate',
    'Granite Estate 6 Plots': 'Estate',
    'Granite Estate 7 Plots': 'Estate',
    'Granite Estate 8 Plots': 'Estate',
    'Granite Estate 10 Plots': 'Estate',
    'Hedge Estate 1 Plot': 'Estate',
    'Hedge Estate 2 Plots': 'Estate',
    'Hedge Estate 3 Plots': 'Estate',
    'Hedge Estate 4 Plots': 'Estate',
    'Hedge Estate 5 Plots': 'Estate',
    'Hedge Estate 6 Plots': 'Estate',
    'Hedge Estate 7 Plots': 'Estate',
    'Hedge Estate 8 Plots': 'Estate',
    'Hedge Estate 10 Plots': 'Estate',
    'Community Niche': 'Other'
}

async function roles () {
    const models = require('../models')
    try {
        let roles = await models.Role.findAll({ where: {}, raw: true })
        let allRoles = {}
        roles = _.groupBy(roles, 'type')
        for (var key in roles) {
            allRoles[key] = {}
            for (let i = 0; i < roles[key].length; i++) {
                allRoles[key][roles[key][i].name] = roles[key][i].id
            // allRoles[roles[key][i].Name] = roles[key][i].id
            }
        }
        return allRoles
    } catch (error) {
        console.log(error)
        return error
    }
}

async function relations () {
    const models = require('../models')
    try {
        const relations = await models.Relation.findAll({ where: {}, raw: true })
        const allRelations = {}
        relations.forEach(ele => {
            allRelations[ele.name] = ele.id
        })
        return allRelations
    } catch (error) {
        return error
    }
}

async function modules () {
    const models = require('../models')
    const modules = await models.Module.findAll({ where: { }, raw: true })
    const allModules = {}
    modules.forEach(ele => {
        allModules[ele.name] = ele.id
    })
    return allModules
}

async function userRoles (format) {
    const models = require('../models')
    const userRoles = await models.UserRole.findAll({ where: { }, raw: true })
    const allUserRoles = {}
    switch (format) {
    case 'list':
        return userRoles
    case 'ids':
        return userRoles.map(role => role.id)
    default:
        userRoles.forEach(ele => {
            allUserRoles[ele.name] = ele.id
        })
        return allUserRoles
    }
}
async function getEmployees () {
    const models = require('../models')
    let employees = await models.Employee.findAll({
        where: {},
        attributes: ['id']
    })
    return employees.map(employee => employee.id)
}

async function countries () {
    const models = require('../models')
    const countriesList = {}
    const countries = await models.Country.findAll({
        where: {}
    })
    countries.forEach(ele => {
        countriesList[ele.name] = ele.id
    })
    return countriesList
}

async function getMaritalStatusIds () {
    const models = require('../models')
    const maritalStatus = await models.MaritalStatus.findAll()
    return maritalStatus.map(e => { return e.id })
}

exports.seed = seed
exports.CallReasons = CallReasons
exports.getroles = roles
exports.relations = relations()
exports.modules = modules
exports.userRoles = userRoles
exports.getCountries = countries
exports.getMaritalStatusIds = getMaritalStatusIds
exports.propertyTypeMappings = propertyTypeMappings
exports.getEmployees = getEmployees
