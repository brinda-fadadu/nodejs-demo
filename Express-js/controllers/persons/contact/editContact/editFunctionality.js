const models = require('../../../../models/index')
const { createOrUpdate } = require('../../../../utils/commonCreateAndUpdate')

async function editFunctionality (data, contactPerson) {
    try {
        let personObj = {
            prefix: data.prefix,
            firstName: data.firstName,
            middleName: data.middleName,
            lastName: data.lastName,
            phoneNumber: data.phoneNumber,
            secondaryPhoneNumber: data.secondaryPhoneNumber,
            email: data.email,
            updatedAt: data.UpdatedAt,
            updatedBy: data.UpdatedBy
        }
        await models.Person.update(personObj, {
            where: {
                id: contactPerson.PersonalInformation.id
            }
        })

        if (contactPerson.PersonalInformation.PersonInformation && (data.birthCountry || data.birthState || data.maidenName || data.address)) {
            console.log('Before updating::::')
            let personInfoObj = {
                birthCountry: data.birthCountry,
                birthState: data.birthState,
                maidenName: data.maidenName
            }
            if (data.address) {
                if (contactPerson.PersonalInformation.PersonInformation.residentialAddressId) {
                    data.address.id = contactPerson.PersonalInformation.PersonInformation.residentialAddressId
                }
                let address = await createOrUpdate(data.address)
                personInfoObj.residentialAddressId = address.id
                if (!contactPerson.PersonalInformation.PersonInformation.residentialAddressId) {
                    contactPerson.PersonalInformation.PersonInformation.residentialAddressId = address.id
                }
            }
            await models.PersonInfo.update(personInfoObj, {
                where: {
                    personId: contactPerson.PersonalInformation.PersonInformation.personId,
                    id: contactPerson.PersonalInformation.PersonInformation.id
                }
            })
        }
        if (data.caseRoleIds.length > 0) {
            await models.ContactCaseRole.destroy({
                where: {
                    contactPersonId: data.contactId
                }
            })
            let caseRoles = await data.caseRoleIds.map(e => {
                return {
                    roleId: e,
                    contactPersonId: Number(data.contactId)
                }
            })
            await models.ContactCaseRole.bulkCreate(
                caseRoles
            )
        }
        await models.ContactPerson.update({
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy
        }, {
            where: {
                personId: data.personId
            }
        })
    } catch (error) {
        throw error
    }
}
module.exports = exports = editFunctionality
