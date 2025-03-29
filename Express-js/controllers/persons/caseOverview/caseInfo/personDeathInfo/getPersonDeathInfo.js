const models = require('../../../../../models')
const { createAddressInclude, createOrganizationInclude } = require('../../../../../lib/commonIncludes')

function getData (result) {
    let placeOfDeath = {}
    let locationOfRemains = {}
    const personalInfoOfResult = result.PersonInformation
    let residentialAddress = personalInfoOfResult.PersonAddress ? { Address: personalInfoOfResult.PersonAddress } : null
    if (residentialAddress) {
        residentialAddress.Address.id = personalInfoOfResult.residentialAddressId
    }
    if (typeof personalInfoOfResult.placeOfDeathOrganizationId === 'number' && personalInfoOfResult.PlaceOfDeathOrganization) {
        personalInfoOfResult.PlaceOfDeathOrganization.Address.id = personalInfoOfResult.placeOfDeathOrganizationId
        placeOfDeath = {
            'type': 'organization',
            'details': personalInfoOfResult.PlaceOfDeathOrganization
        }
    } else if (typeof personalInfoOfResult.placeOfDeathAddressId === 'number' && personalInfoOfResult.PlaceOfDeathAddress) {
        personalInfoOfResult.PlaceOfDeathAddress.id = personalInfoOfResult.placeOfDeathAddressId
        placeOfDeath = {
            'type': 'address',
            'details': { Address: personalInfoOfResult.PlaceOfDeathAddress }
        }
    }
    if (typeof personalInfoOfResult.locationOfRemainId === 'number' && personalInfoOfResult.LocationOfRemainsOrganization) {
        personalInfoOfResult.LocationOfRemainsOrganization.Address.id = personalInfoOfResult.locationOfRemainId
        locationOfRemains = {
            'type': 'organization',
            'details': personalInfoOfResult.LocationOfRemainsOrganization
        }
    } else if (typeof personalInfoOfResult.locationOfRemainAddressId === 'number' && personalInfoOfResult.LocationOfRemainAddress) {
        personalInfoOfResult.LocationOfRemainAddress.id = personalInfoOfResult.locationOfRemainAddressId
        locationOfRemains = {
            'type': 'address',
            'details': { Address: personalInfoOfResult.LocationOfRemainAddress }
        }
    }

    const finalObj = {
        id: result.id,
        onePortalId: result.onePortalId,
        dateOfDeath: result.dateOfDeath,
        hospitalDeathStatus: personalInfoOfResult.hospitalDeathStatus,
        residentialAddress: residentialAddress,
        placeOfDeath,
        locationOfRemains
    }
    return finalObj
}

async function getInfo (onePortalId) {
    try {
        const result = await models.Person.findOne({
            where: {
                onePortalId
            },
            attributes: ['id', 'onePortalId', 'dateOfDeath'],
            include: [
                {
                    model: models.PersonInfo,
                    as: 'PersonInformation',
                    include: [
                        ...createOrganizationInclude('PlaceOfDeathOrganization'),
                        ...createAddressInclude('PlaceOfDeathAddress'),
                        ...createOrganizationInclude('LocationOfRemainsOrganization'),
                        ...createAddressInclude('LocationOfRemainAddress'),
                        ...createAddressInclude('PersonAddress')
                    ]
                }
            ]
        })
        const finalOutCome = getData(result)
        return finalOutCome
    } catch (error) {
        throw error
    }
}

module.exports = {
    getInfo
}
