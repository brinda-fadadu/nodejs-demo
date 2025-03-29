const models = require('../../models')
const getNotesFromCalls = require('./getNotes')
const { createAddressInclude, createOrganizationInclude } = require('../../lib/commonIncludes')

/**
 * Get person overview based on onePortalId.
 */
exports.getPersonOverview = async function (onePortalId, type) {
    let responseObj
    try {
        let person = await models.Person.findOne({
            where: {
                OnePortalId: onePortalId
            },
            include: [
                {
                    model: models.PersonInfo,
                    as: 'PersonInformation',
                    include: [
                        ...createOrganizationInclude('PlaceOfBirthOrganization'),
                        ...createOrganizationInclude('PlaceOfDeathOrganization'),
                        ...createAddressInclude('PersonAddress'),
                        ...createAddressInclude('PlaceOfDeathAddress')
                    ]
                },
                {
                    model: models.MaritalStatus,
                    as: 'MaritalStatus'
                },
                {
                    model: models.Arrangement,
                    as: 'PersonAsArrangement'
                }
            ]
        })
        if (person && type !== 'caseInfo') {
            const informantRole = await models.Role.findOne({ where: { name: 'Informant' } })
            const informantContact = await models.ContactPerson.findOne({
                attributes: [ 'id', 'resourceId' ],
                include: [
                    {
                        model: models.ContactCaseRole,
                        as: 'caseRoles',
                        where: {
                            roleId: informantRole.id
                        }
                    }
                ],
                where: {
                    personId: person.id
                }
            })
            person = person.toJSON()
            let personInfo = person.PersonInformation
            let notes = await getNotesFromCalls(person.id)
            // TODO Need to add contact, nokPerson, cemeteryContracts, funeralStatements

            responseObj = getBasicResponseFromPerson(person)
            let caseInfo = {}
            let personPrimaryInfo = getPrimaryInfoFromPerson(person)
            if (personInfo) {
                let secondaryInfo = getSecondaryInfoFromPersonInfo(personInfo)
                caseInfo.certifier = personInfo.CertifierInfo
                caseInfo.secondaryInfo = secondaryInfo
            }
            if (informantContact) {
                const informantPerson = await models.Person.findOne({
                    attributes: ['id', 'prefix', 'firstName', 'middleName', 'lastName', 'phoneNumber', 'email'],
                    where: { id: informantContact.resourceId }
                })
                responseObj.informant = informantPerson
            }
            caseInfo.personPrimaryInfo = personPrimaryInfo
            // caseInfo.notes = notes
            responseObj.caseInfo = caseInfo
            responseObj.notes = notes
            responseObj.arrangement = person.PersonAsArrangement
            return responseObj
        } else {
            throw new Error('PERSON_NOT_FOUND')
        }
    } catch (error) {
        throw error
    }
}

function getBasicResponseFromPerson (person) {
    let responseObj = {
        id: person.id,
        onePortalId: person.onePortalId,
        prefix: person.prefix,
        firstName: person.firstName,
        middleName: person.middleName,
        lastName: person.lastName,
        phone: person.phoneNumber,
        email: person.email,
        isAlive: person.isAlive,
        isPNTurnAN: person.isPNTurnAN
    }
    return responseObj
}

function getPrimaryInfoFromPerson (person) {
    let personPrimaryInfo = {
        id: person.id,
        onePortalId: person.onePortalId,
        prefix: person.prefix,
        firstName: person.firstName,
        middleName: person.middleName,
        lastName: person.lastName,
        phone: person.phoneNumber,
        email: person.email,
        languageId: person.languageId,
        dateOfBirth: person.dateOfBirth,
        dateOfDeath: person.dateOfDeath,
        aka: person.aka,
        maritalStatus: person.maritalStatus
    }
    return personPrimaryInfo
}

function getSecondaryInfoFromPersonInfo (personInfo) {
    let secondaryInfo = {
        id: personInfo.id,
        placeOfBirth: personInfo.PlaceOfBirthOrganization
            ? {
                line1: personInfo.PlaceOfBirthOrganization.Address.line1,
                line2: personInfo.PlaceOfBirthOrganization.Address.line2,
                city: personInfo.PlaceOfBirthOrganization.Address.city,
                state: personInfo.PlaceOfBirthOrganization.Address.state,
                county: personInfo.PlaceOfBirthOrganization.Address.county,
                country: personInfo.PlaceOfBirthOrganization.Address.country,
                zipCode: personInfo.PlaceOfBirthOrganization.Address.zipcode
            }
            : null,
        placeOfDeath: personInfo.PlaceOfDeathOrganization
            ? {
                line1: personInfo.PlaceOfDeathOrganization.Address.line1,
                line2: personInfo.PlaceOfDeathOrganization.Address.line2,
                city: personInfo.PlaceOfDeathOrganization.Address.city,
                state: personInfo.PlaceOfDeathOrganization.Address.state,
                county: personInfo.PlaceOfDeathOrganization.Address.county,
                country: personInfo.PlaceOfDeathOrganization.Address.country,
                zipCode: personInfo.PlaceOfDeathOrganization.Address.zipcode
            }
            : personInfo.PlaceOfDeathAddress
                ? {
                    line1: personInfo.PlaceOfDeathAddress.line1 ? personInfo.PlaceOfDeathAddress.line1 : null,
                    line2: personInfo.PlaceOfDeathAddress.line2 ? personInfo.PlaceOfDeathAddress.line2 : null,
                    city: personInfo.PlaceOfDeathAddress.city ? personInfo.PlaceOfDeathAddress.city : null,
                    state: personInfo.PlaceOfDeathAddress.state ? personInfo.PlaceOfDeathAddress.state : null,
                    county: personInfo.PlaceOfDeathAddress.county ? personInfo.PlaceOfDeathAddress.county : null,
                    country: personInfo.PlaceOfDeathAddress.country ? personInfo.PlaceOfDeathAddress.country : null,
                    zipCode: personInfo.PlaceOfDeathAddress.zipcode ? personInfo.PlaceOfDeathAddress.zipcode : null
                } : null,
        residentialAddress: personInfo.PersonAddress
            ? {
                line1: personInfo.PersonAddress.line1,
                line2: personInfo.PersonAddress.line2,
                city: personInfo.PersonAddress.city,
                state: personInfo.PersonAddress.state,
                county: personInfo.PersonAddress.county,
                country: personInfo.PersonAddress.country,
                zipCode: personInfo.PersonAddress.zipcode
            }
            : null,
        noOfYearsStayed: personInfo.NoOfYearsStayed,
        ethinicity: personInfo.Ethinicity,
        maidenName: personInfo.MaidenName,
        firstParent: personInfo.FirstParent
    }
    return secondaryInfo
}
