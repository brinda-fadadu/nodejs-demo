const { getroles } = require('../../../config/seed')
const { getRelations, roleAndRelationValidation } = require('../../../utils/helpers/contactsHelpers')
async function checkRolesValidation (data) {
    try {
        let rolesList = await getroles()
        let roles = rolesList.Contact
        let dataToValidate = {
            personId: data.personId
        }

        let existingRoles
        let rolesToValidate = [roles['Notifier'], roles['Informant'], roles['Power of Attorney'], roles['Funeral Authoriser']]
        if (data.caseRoleIds.length > 0 && data.caseRoleIds.some(e => rolesToValidate.includes(e))) {
            dataToValidate.roleIds = []
            if (data.caseRoleIds.indexOf(roles['Notifier']) > -1) {
                dataToValidate.roleIds.push(roles['Notifier'])
            }
            if (data.caseRoleIds.indexOf(roles['Informant']) > -1) {
                dataToValidate.roleIds.push(roles['Informant'])
            }
            if (data.caseRoleIds.indexOf(roles['Power of Attorney']) > -1) {
                dataToValidate.roleIds.push(roles['Power of Attorney'])
            }
            if (data.caseRoleIds.indexOf(roles['Funeral Authoriser']) > -1) {
                dataToValidate.roleIds.push(roles['Funeral Authoriser'])
            }
            existingRoles = await roleAndRelationValidation(dataToValidate, 'CaseRoles')
        } else {
            return true
        }
        if (existingRoles.length > 0) {
            if (existingRoles.includes(roles['Notifier'])) {
                throw new Error('DUPLICATE_NOTIFIER')
            } else if (existingRoles.includes(roles['Informant'])) {
                throw new Error('DUPLICATE_INFORMANT')
            } else if (existingRoles.includes(roles['Power of Attorney'])) {
                throw new Error('DUPLICATE_POWER_OF_ATTORNEY')
            } else if (existingRoles.includes(roles['Funeral Authoriser'])) {
                throw new Error('DUPLICATE_FUNERAL_AUTHORISER')
            } else {
                return true
            }
        } else {
            return true
        }
    } catch (error) {
        throw error
    }
}

async function checkRelationValidation (data) {
    try {
        const spouse = true
        let relations = await getRelations(spouse, 'createContact')
        let dataToValidate = {
            personId: data.personId,
            relationId: data.relationId
        }
        let isExists = await roleAndRelationValidation(dataToValidate, 'Relation')
        if (data.relationId === relations['Father']) {
            switch (isExists) {
            case true:
                throw new Error('DUPLICATE_FATHER')
            case false:
                return true
            default:
                break
            }
        } else if (data.relationId === relations['Mother']) {
            switch (isExists) {
            case true:
                throw new Error('DUPLICATE_MOTHER')
            case false:
                return true
            default:
                break
            }
        } else if (data.relationId === relations['Spouse']) {
            switch (isExists) {
            case true:
                throw new Error('DUPLICATE_SPOUSE')
            case false:
                return true
            default:
                break
            }
        } else {
            return true
        }
    } catch (error) {
        throw error
    }
}
module.exports = {
    checkRolesValidation,
    checkRelationValidation
}
