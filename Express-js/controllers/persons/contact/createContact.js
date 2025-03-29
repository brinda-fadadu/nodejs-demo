const models = require('../../../models/index')
const moment = require('moment')
const {
    isPersonFound
} = require('./contactHelper')
const { formatAddress } = require('../../../utils/addressValidation')

async function createContact (data) {
    try {
        const personId = Number(data.personId)
        const currentTime = moment().format('MM/DD/YYYY HH:mm:ss')
        await isPersonFound(personId) // checking person exists or not and verified or not
        let contactPerson = {
            personId: personId,
            contactType: data.contactType,
            isOrganization: data.isOrganization || false,
            createdBy: data.userId,
            updatedBy: data.userId,
            createdAt: currentTime,
            updatedAt: currentTime,
            relationId: data.relationId,
            caseRoles: []
        }
        let includeObj = []
        if (data.contactType === 1 || data.contactType === 3) {
            contactPerson.PersonalInformation = {
                firstName: data.firstName,
                lastName: data.lastName,
                middleName: data.middleName,
                prefix: data.prefix,
                email: data.email,
                phoneNumber: data.phoneNumber,
                secondaryPhoneNumber: data.secondaryPhoneNumber,
                PersonInformation: {
                    maidenName: data.maidenName || null,
                    birthState: data.birthState,
                    birthCountry: data.birthCountry
                }
            }
            includeObj.push({
                model: models.Person,
                as: 'PersonalInformation',
                include: [{
                    model: models.PersonInfo,
                    as: 'PersonInformation',
                    include: [{
                        model: models.Address,
                        as: 'PersonAddress'
                    }]
                }]
            })
            if (data.address) {
                contactPerson.PersonalInformation.PersonInformation.PersonAddress = await formatAddress(data.address)
            }
        } else {
            contactPerson.staffId = data.staffId
        }
        data.caseRoleIds.forEach(ele => {
            contactPerson.caseRoles.push({
                roleId: ele
            })
        })
        includeObj.push({
            model: models.ContactCaseRole,
            as: 'caseRoles'
        })
        const resContact = await models.ContactPerson.create(contactPerson, {
            include: includeObj
        })
        return resContact
    } catch (error) {
        throw error
    }
}
module.exports = exports = createContact
