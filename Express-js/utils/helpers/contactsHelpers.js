const models = require('../../models')

async function roleAndRelationValidation (data, fieldTovalidate) {
    let whereObj = { personId: data.personId, deletedAt: null, deletedBy: null }
    let includeObj = []
    switch (fieldTovalidate) {
    case 'Relation':
        whereObj.relationId = data.relationId
        break
    case 'CaseRoles':
        includeObj.push({
            model: models.ContactCaseRole,
            where: {
                roleId: data.roleIds
            },
            attributes: ['roleId'],
            as: 'caseRoles'
        })
        break
    default:
        break
    }
    const contact = await models.ContactPerson.findOne({
        where: whereObj,
        include: includeObj
    })
    if (contact) {
        if (fieldTovalidate === 'CaseRoles') {
            let existingRoles = contact.caseRoles.map(e => {
                return e.roleId
            })
            return existingRoles
        }
        if (fieldTovalidate === 'Relation') {
            return true
        }
    } else {
        return false
    }
}
async function getRelations (spouse, from) {
    let nameWhere = ['Father', 'Mother']
    switch (spouse) {
    case true:
        nameWhere.push('Spouse')
        break
    case false:
        break
    default:
        break
    }
    try {
        const relations = await models.Relation.findAll({
            where: {
                name: nameWhere
            }
        })
        switch (from) {
        case 'createContact':
            let relationsObj = {}
            relations.forEach((e) => {
                relationsObj[e.name] = e.id
            })
            return relationsObj
        case 'listContacts':
            return relations.map((e) => e.id)
        default:
            break
        }
    } catch (error) {
        return error
    }
}
module.exports = { roleAndRelationValidation, getRelations }
