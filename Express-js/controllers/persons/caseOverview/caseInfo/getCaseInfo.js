const models = require('../../../../models')
const { createAddressInclude, createOrganizationInclude } = require('../../../../lib/commonIncludes')

async function CaseInfo (onePortalId) {
    try {
        let person = await models.Person.findAll({
            where: {
                onePortalId
            },
            include: [
                {
                    model: models.PersonInfo,
                    as: 'PersonInformation',
                    include: createIncludeObject()
                }
            ]
        })
        if (person.length > 0) {
            let jsonRes = person[0].toJSON()
            return jsonRes
        } else {
            throw new Error('Person not found')
        }
    } catch (error) {
        throw error
    }
}

function createIncludeObject () { // function to return included models object for the personInfo
    let includeObj = [
        ...createOrganizationInclude('PlaceOfDeathOrganization'),
        ...createAddressInclude('PersonAddress'),
        ...createOrganizationInclude('PlaceOfBirthOrganization'),
        ...createOrganizationInclude('LocationOfRemainsOrganization'),
        ...createPersonsInclude()
    ]
    return includeObj
}

function createPersonsInclude () { // function to return include object for persons in the caseInfo like veteran, certifier, and qualification details
    return [
        {
            model: models.Veteran,
            include: [
                {
                    model: models.ServiceBranch
                }
            ]
        },
        ...includeEthinicity(),
        {
            model: models.Certifier,
            as: 'CertifierInfo',
            include: [
                {
                    model: models.Address
                }
            ]
        },
        {
            model: models.Qualification,
            as: 'Education'
        }
    ]
}
function includeEthinicity () { // function to return include object for ethnicity details in the caseInfo
    return [
        {
            model: models.PersonEthnicity,
            as: 'EthnicityInformation',
            include: [
                {
                    model: models.Race,
                    as: 'RaceOne'
                },
                {
                    model: models.Race,
                    as: 'RaceTwo'
                },
                {
                    model: models.Race,
                    as: 'RaceThree'
                },
                {
                    model: models.Ethnicity,
                    as: 'Hispanic'
                },
                {
                    model: models.Ethnicity,
                    as: 'EthnicityOne'
                },
                {
                    model: models.Ethnicity,
                    as: 'EthnicityTwo'
                },
                {
                    model: models.Ethnicity,
                    as: 'EthnicityThree'
                }
            ]
        }
    ]
}

module.exports = exports = CaseInfo
