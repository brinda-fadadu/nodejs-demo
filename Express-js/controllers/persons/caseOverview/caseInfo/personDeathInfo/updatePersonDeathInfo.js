const models = require('../../../../../models')
const moment = require('moment')
let { checkAddressWithIdAndUpdate, createAddress, deleteExistingAddress, createOrg } = require('../../anRemains/updateAnRemainsTransferInfo')
const getDeathInfocontroller = require('./getPersonDeathInfo')
const { formatAddress } = require('../../../../../utils/addressValidation')

async function updateDeathInfo (onePortalId, deathInfo, userId, res) {
    try {
        const person = await models.Person.findOne({
            where: {
                onePortalId
            }
        })
        if (person) {
            await models.sequelize.transaction(async (t) => {
                let updatedPersonDeathInfo = await getdeathInfoInputObj(deathInfo)
                // POD cases:
                // trying to edit POD address, input: given existing POD id and not residential address of that person -- deleting existing address
                if (deathInfo.existingPlaceOfDeathAddressId &&
                    deathInfo.decedentResidentialAddressId !== deathInfo.existingPlaceOfDeathAddressId &&
                    (
                        (deathInfo.placeOfDeathTypeId !== 3) ||
                        (deathInfo.placeOfDeathTypeId === 3 && deathInfo.placeOfDeathSameAsResidentialAddress)
                    )
                ) {
                    await deleteExistingAddress(deathInfo.existingPlaceOfDeathAddressId)
                }
                // creating POD as org and giving new org input
                if (deathInfo.placeOfDeathTypeId === 2 && typeof deathInfo.placeOfDeath === 'object') {
                    let org = await createOrg(updatedPersonDeathInfo.PlaceOfDeathOrganization, t)
                    updatedPersonDeathInfo.placeOfDeathOrganizationId = org.id
                    if (deathInfo.locationOfRemainsSameAsPlaceOfDeath) {
                        updatedPersonDeathInfo.locationOfRemainId = updatedPersonDeathInfo.placeOfDeathOrganizationId
                        updatedPersonDeathInfo.locationOfRemainAddressId = null
                    }
                } else if (deathInfo.placeOfDeathTypeId === 3 &&
                    typeof deathInfo.placeOfDeath === 'object' &&
                    !deathInfo.placeOfDeathSameAsResidentialAddress) {
                    // creating POD as address, giving new address object and not same as place of residence
                    updatedPersonDeathInfo.placeOfDeathOrganizationId = null
                    deathInfo.placeOfDeath = await formatAddress(deathInfo.placeOfDeath)
                    // updating existing POD address with some additional data
                    if (deathInfo.existingPlaceOfDeathAddressId && deathInfo.existingPlaceOfDeathAddressId !== deathInfo.decedentResidentialAddressId) {
                        let loc = 'place of death'
                        await checkAddressWithIdAndUpdate(deathInfo.existingPlaceOfDeathAddressId, deathInfo.placeOfDeath, loc, t)
                        // initially if LOR is same as POD making that particular field to null
                        if (deathInfo.locationOfRemainsSameAsPlaceOfDeath) {
                            updatedPersonDeathInfo.locationOfRemainAddressId = deathInfo.existingPlaceOfDeathAddressId
                            updatedPersonDeathInfo.locationOfRemainId = null
                        }
                    } else {
                        let address = await createAddress(deathInfo.placeOfDeath)
                        updatedPersonDeathInfo.placeOfDeathAddressId = address.id
                        // initially if LOR is same as POD making that particular field to null
                        if (deathInfo.locationOfRemainsSameAsPlaceOfDeath) {
                            updatedPersonDeathInfo.locationOfRemainAddressId = updatedPersonDeathInfo.placeOfDeathAddressId
                            updatedPersonDeathInfo.locationOfRemainId = null
                        }
                    }
                }
                // LOR cases:
                // LOR is not same as POD i.e, case:1 same as residential address case 2: same as POD
                if (!deathInfo.locationOfRemainsSameAsPlaceOfDeath) {
                    // giving existing address id for LOR, not residential address -- deleting existing address for LOR
                    if (deathInfo.existingLocationOfRemainAddressId &&
                        deathInfo.decedentResidentialAddressId !== deathInfo.existingLocationOfRemainAddressId &&
                        (
                            (
                                deathInfo.locationOfRemainTypeId !== 3) ||
                            (
                                deathInfo.existingLocationOfRemainAddressId &&
                                deathInfo.locationOfRemainTypeId === 3 &&
                                deathInfo.locationOfRemainsSameAsResidentialAddress
                            )
                        )
                    ) {
                        if (!(deathInfo.existingPlaceOfDeathAddressId &&
                            deathInfo.existingPlaceOfDeathAddressId === deathInfo.existingLocationOfRemainAddressId)) {
                            await deleteExistingAddress(deathInfo.existingLocationOfRemainAddressId)
                        }
                    }
                    // creating LOR as org and providing input obj for org
                    if (deathInfo.locationOfRemainTypeId === 2 && typeof deathInfo.locationOfRemains === 'object') {
                        let org = await createOrg(updatedPersonDeathInfo.locationOfRemainOrganization, t)
                        updatedPersonDeathInfo.locationOfRemainId = org.id
                    } else if (deathInfo.locationOfRemainTypeId === 3 &&
                        typeof deathInfo.locationOfRemains === 'object' &&
                        !deathInfo.locationOfRemainsSameAsResidentialAddress) { // giving new address for LOR and not same as residential address
                        updatedPersonDeathInfo.locationOfRemainId = null
                        deathInfo.locationOfRemains = await formatAddress(deathInfo.locationOfRemains)
                        // updating address for LOR with existing address id
                        if (deathInfo.existingLocationOfRemainAddressId && deathInfo.existingLocationOfRemainAddressId !== deathInfo.decedentResidentialAddressId && deathInfo.existingLocationOfRemainAddressId !== deathInfo.existingPlaceOfDeathAddressId) {
                            let loc = 'place of remain'
                            await checkAddressWithIdAndUpdate(deathInfo.existingLocationOfRemainAddressId, deathInfo.locationOfRemains, loc, t)
                        } else {
                            // crating new address for LOR
                            let address = await createAddress(deathInfo.locationOfRemains)
                            updatedPersonDeathInfo.locationOfRemainAddressId = address.id
                        }
                    }
                }
                // trying to edit LOR address, input: given existing LOR id and not same as POD of that person -- deleting existing address
                if (deathInfo.existingLocationOfRemainAddressId &&
                    (
                        deathInfo.locationOfRemainsSameAsPlaceOfDeath ||
                        deathInfo.locationOfRemainsSameAsResidentialAddress ||
                        !deathInfo.locationOfRemains
                    ) &&
                    deathInfo.existingLocationOfRemainAddressId !== deathInfo.decedentResidentialAddressId &&
                    deathInfo.existingLocationOfRemainAddressId !== deathInfo.existingPlaceOfDeathAddressId) {
                    await deleteExistingAddress(deathInfo.existingLocationOfRemainAddressId)
                }

                person.dateOfDeath = updatedPersonDeathInfo.dateOfDeath
                person.updatedAt = moment()
                person.updatedBy = userId
                await person.save()
                const result = await models.PersonInfo.update(updatedPersonDeathInfo,
                    {
                        where: { personId: person.id },
                        transaction: t
                    }
                )
                return result
            })
            let finalResult = await getDeathInfocontroller.getInfo(onePortalId)
            return finalResult
        } else {
            throw new Error('Record not found with this Portal ID')
        }
    } catch (error) {
        throw error
    }
}

const getdeathInfoInputObj = async (deathInfoObj) => {
    let deathInfoDataObj = deathInfoObj
    // POD cases: if no input for POD then making POD address and org fields to null
    if (!deathInfoObj.placeOfDeath) {
        deathInfoDataObj.placeOfDeathAddressId = deathInfoDataObj.placeOfDeathOrganizationId = null
    }
    // POD cases: for POD if same as residence is selected then making POD org field to null
    if (deathInfoObj.placeOfDeathSameAsResidentialAddress) {
        deathInfoDataObj.placeOfDeathAddressId = deathInfoObj.decedentResidentialAddressId
        deathInfoDataObj.placeOfDeathOrganizationId = null
        if (deathInfoObj.locationOfRemainsSameAsPlaceOfDeath) {
            deathInfoDataObj.locationOfRemainAddressId = deathInfoObj.decedentResidentialAddressId
            deathInfoDataObj.locationOfRemainId = null
        }
    }
    // 2 for Organisation  and 3 for address
    // providing org obj and number for updating
    if (deathInfoObj.placeOfDeathTypeId === 2) {
        if (typeof deathInfoObj.placeOfDeath === 'number') {
            let organization = await models.Organization.findOne({
                where: {
                    id: deathInfoObj.placeOfDeath
                }
            })
            if (organization) {
                deathInfoDataObj.placeOfDeathOrganizationId = deathInfoObj.placeOfDeath
                if (deathInfoObj.locationOfRemainsSameAsPlaceOfDeath) {
                    deathInfoDataObj.locationOfRemainId = deathInfoDataObj.placeOfDeathOrganizationId
                    deathInfoDataObj.locationOfRemainAddressId = null
                }
            } else {
                throw new Error('Selected Organization not found in the database for place of death')
            }
        } else if (typeof deathInfoObj.placeOfDeath === 'object') {
            deathInfoDataObj.PlaceOfDeathOrganization = {
                name: deathInfoObj.placeOfDeath.name,
                organizationTypeId: deathInfoObj.placeOfDeath.organizationTypeId,
                phoneNumber: deathInfoObj.placeOfDeath.phoneNumber,
                Address: await formatAddress(deathInfoObj.placeOfDeath.address)
            }
        }
        deathInfoDataObj.placeOfDeathAddressId = null
    }
    // LOR cases:
    // if no input for LOR then making LOR address and org fields to null
    if (!deathInfoObj.locationOfRemains && !deathInfoObj.locationOfRemainsSameAsPlaceOfDeath) {
        deathInfoDataObj.locationOfRemainAddressId = deathInfoDataObj.locationOfRemainId = null
    }
    // LOR cases: for LOR if same as residence is selected then making LOR org field to null
    if (deathInfoObj.locationOfRemainsSameAsResidentialAddress) {
        deathInfoDataObj.locationOfRemainAddressId = deathInfoObj.decedentResidentialAddressId
        deathInfoDataObj.locationOfRemainId = null
    }
    // providing org obj and number for updating
    if (deathInfoObj.locationOfRemainTypeId === 2 && !deathInfoObj.locationOfRemainsSameAsPlaceOfDeath) {
        if (typeof deathInfoObj.locationOfRemains === 'number') {
            let organization = await models.Organization.findOne({
                where: {
                    id: deathInfoObj.locationOfRemains
                }
            })
            if (organization) {
                deathInfoDataObj.locationOfRemainId = deathInfoObj.locationOfRemains
            } else {
                throw new Error('Selected Organization not found in the database for place of death')
            }
        } else if (typeof deathInfoObj.locationOfRemains === 'object') {
            deathInfoDataObj.locationOfRemainOrganization = {
                name: deathInfoObj.locationOfRemains.name,
                organizationTypeId: deathInfoObj.locationOfRemains.organizationTypeId,
                phoneNumber: deathInfoObj.locationOfRemains.phoneNumber,
                Address: await formatAddress(deathInfoObj.locationOfRemains.address)
            }
        }
        deathInfoDataObj.locationOfRemainAddressId = null
    }
    return deathInfoDataObj
}

module.exports = {
    updateDeathInfo
}
