const models = require('../../../../models/index')

const getContactDetails = require('../getContactDetail')
const editFunctionality = require('./editFunctionality')
const { checkRolesValidation, checkRelationValidation } = require('../rolesAndRelationValidation')
const { seed } = require('../../../../config/seed')
const { isPersonFound } = require('../../contact/contactHelper')
const _ = require('underscore')

let t

async function editContact (data) {
    try {
        t = await models.sequelize.transaction()
        let validRoles = true
        let validRelation = true
        // to check if the person exists
        await isPersonFound(data.personId)
        let contactPerson = await getContactDetails(data.personId, data.contactId)
        let staffContactType = Number(Object.keys(seed.ContactType).find(key => seed.ContactType[key] === 'Staff'))
        let existingRoleIds = contactPerson.caseRoles.length > 0 ? contactPerson.caseRoles.map(e => {
            return e.roleId
        }) : []
        let diffRoles = _.difference(data.caseRoleIds, existingRoleIds)
        let dataToValidate = {
            personId: data.personId
        }
        dataToValidate.caseRoleIds = diffRoles
        validRoles = await checkRolesValidation(dataToValidate)
        if (contactPerson.contactType !== 3 && data.relationId !== 0 && (contactPerson.relationId !== data.relationId) && data.contactType !== staffContactType) {
            validRelation = await checkRelationValidation(data)
        }
        if (validRoles) {
            switch (contactPerson.contactType) {
            case 1:
            case 3:
                if (validRelation) {
                    await editFunctionality(data, contactPerson)
                }
                break
            case 2:
                // update employee details here
                await models.ContactCaseRole.destroy({
                    where: {
                        contactPersonId: data.contactId
                    }
                })

                await models.ContactCaseRole.bulkCreate(data.roleIds.map(x => ({
                    roleId: x, contactPersonId: data.contactId
                })))

                contactPerson.staffId = data.staffId
                break
            default:
                break
            }
            contactPerson.relationId = data.relationId
            await contactPerson.save()
            await t.commit()
            return contactPerson
        } else {
            throw new Error('Contact can not be updated')
        }
    } catch (error) {
        await t.rollback()
        throw error
    }
}

module.exports = exports = editContact
