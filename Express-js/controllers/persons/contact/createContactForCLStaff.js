const models = require('../../../models/index')
const moment = require('moment')
const {
    isPersonFound
} = require('./contactHelper')
const _ = require('underscore')

async function createContactForCLStaff (data) {
    return models.sequelize.transaction(async (t) => {
        try {
            const personId = Number(data.personId)
            const currentTime = moment().format('MM/DD/YYYY HH:mm:ss')
            await isPersonFound(personId) // checking person exists or not and verified or not

            let existingStaff = await models.ContactPerson.findOne({
                where: {
                    PersonId: personId,
                    StaffId: data.staffId,
                    DeletedAt: null
                },
                include: [
                    {
                        model: models.ContactCaseRole,
                        as: 'caseRoles'
                    }
                ]
            })

            if (existingStaff) {
                // Existing staff
                // Check if the role exists
                if (_.intersection(existingStaff.caseRoles.map(x => x.RoleId), data.roleIds).length) {
                    // Role already exists
                    throw new Error('DUPLICATE_ROLE_FOR_STAFF')
                } else {
                    // Create a new case role
                    await models.ContactCaseRole.bulkCreate(data.roleIds.map(x => ({ RoleId: x, ContactPersonId: existingStaff.id })), { transaction: t })
                }
                return existingStaff
            } else {
                // No existing staff
                // Create a new contact person for this staff
                let contactPerson = {
                    personId: personId,
                    contactType: data.contactType,
                    staffId: data.staffId,
                    createdBy: data.userId,
                    updatedBy: data.userId,
                    createdAt: currentTime,
                    updatedAt: currentTime
                }

                contactPerson.caseRoles = data.roleIds.map(x => {
                    return {
                        roleId: x
                    }
                })

                let include = []

                include.push({
                    model: models.ContactCaseRole,
                    as: 'caseRoles'
                })

                const resContact = await models.ContactPerson.create(contactPerson, {
                    include,
                    transaction: t
                })

                return resContact
            }
        } catch (error) {
            await t.rollback()
            throw error
        }
    })
}
module.exports = exports = createContactForCLStaff
