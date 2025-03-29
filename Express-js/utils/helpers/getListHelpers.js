
const models = require('../../models')
const getAllContacts = require('../../controllers/persons/contact/getAllContacts')
const _ = require('underscore')

async function getContactsIdsForAnRemains (personId) {
    try {
        const queries = {
            getParentDetails: false,
            roleIds: await getAnRemainsRoleIds('anRemains')
        }
        const contacts = await getAllContacts(personId, queries)

        let contactIds = contacts.length > 0 ? (
            contacts.map(e => {
                return e.id
            })
        ) : []

        return contactIds
    } catch (error) {
        throw error
    }
}

async function getAnRemainsRoleIds (from) {
    let whereCondition = {
        Type: 'Contact'
    }
    switch (from) {
    case 'anRemains':
        whereCondition.Name = [
            'Power of Attorney',
            'Next of Kin',
            'Funeral Authoriser'
        ]
        break
    default:
        break
    }

    const roleIds = models.Role.findAll({
        where: whereCondition
    })
    return roleIds.map((e) => { return e.id })
}
async function getRolesOnType (roleType) {
    let result = await models.Role.findAll({
        where: {
            Type: roleType || 'Agreement'
        },
        json: true
    })
    return _.pluck(result, 'id')
}
module.exports = {
    getContactsIdsForAnRemains,
    getRolesOnType
}
