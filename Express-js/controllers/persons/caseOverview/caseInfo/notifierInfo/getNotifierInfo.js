const queryHelper = require('./notifierQueryHelper')
function getData (result) {
    let finalObj = {}
    finalObj = {
        id: result.id,
        onePortalId: result.PersonalInformation.onePortalId,
        prefix: result.PersonalInformation.prefix,
        firstName: result.PersonalInformation.firstName,
        middleName: result.PersonalInformation.middleName,
        lastName: result.PersonalInformation.lastName,
        phoneNumber: result.PersonalInformation.phoneNumber,
        secondaryPhoneNumber: result.PersonalInformation.secondaryPhoneNumber,
        contactType: result.contactType,
        isOrganization: result.isOrganization,
        aka: result.PersonalInformation.aka,
        email: result.PersonalInformation.email,
        organizationId: result.PersonalInformation.organizationId,
        relation: result.Relation,
        caseRoles: result.caseRoles,
        personAddress: result.PersonalInformation.PersonInformation ? result.PersonalInformation.PersonInformation.PersonAddress ? { id: result.PersonalInformation.PersonInformation.residentialAddressId, Address: result.PersonalInformation.PersonInformation.PersonAddress } : null : null,
        personOrganizationAddress: result.PersonalInformation.PersonOrganization
    }
    return finalObj
}

async function getInfo (personId) {
    try {
        const result = await queryHelper.getQuery(personId)
        if (result) {
            return getData(result)
        } else {
            return {}
        }
    } catch (error) {
        throw error
    }
}

module.exports = {
    getInfo
}
