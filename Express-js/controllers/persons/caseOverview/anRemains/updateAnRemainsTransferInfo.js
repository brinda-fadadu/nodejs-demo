const models = require('../../../../models')
const { formatAddress } = require('./../../../../utils/addressValidation')

const moment = require('moment')

async function updateAnRemainsTransferInfo (personId, transferId, userId, data) {
    try {
        const anRemainsInfo = await models.AnRemainsInfo.findOne({
            where: {
                personId: Number(personId)
            }
        })
        const remainsId = anRemainsInfo.id
        let anRemainsTransferRecord = await models.AnRemainsTransfer.findOne({
            where: {
                Identifier: transferId,
                IsTransferComplete: false
            }
        })
        if (anRemainsTransferRecord) {
            let outcome = await models.sequelize.transaction(async (t) => {
                let anremainsTransferObj = await getAnremainsInfoTransferInputObject(data, remainsId, userId)
                if (data.existingFromAddressId && data.fromLocationTypeId !== 3) {
                    await deleteExistingAddress(data.existingFromAddressId)
                }
                if (data.fromLocationTypeId === 2 && typeof data.fromLocation === 'object') {
                    let org = await createOrg(anremainsTransferObj.TransferFromOrganization, t)
                    anremainsTransferObj.TransferFromOrganizationId = org.id
                } else if (data.fromLocationTypeId === 3 && data.fromLocation) {
                    anremainsTransferObj.TransferFromOrganizationId = anremainsTransferObj.TransferFromLocationId = null
                    data.fromLocation = await formatAddress(data.fromLocation)
                    if (data.existingFromAddressId) {
                        let loc = 'from location'
                        await checkAddressWithIdAndUpdate(data.existingFromAddressId, data.fromLocation, loc, t)
                    } else {
                        let address = await createAddress(data.fromLocation)
                        anremainsTransferObj.TransferFromAddressId = address.id
                    }
                }
                if (data.existingToAddressId && data.toLocationTypeId !== 3) {
                    await deleteExistingAddress(data.existingToAddressId)
                }
                if (data.toLocationTypeId === 2 && typeof data.toLocation === 'object') {
                    let org = await createOrg(anremainsTransferObj.TransferToOrganization, t)
                    anremainsTransferObj.TransferToOrganizationId = org.id
                } else if (data.toLocationTypeId === 3 && data.toLocation) {
                    anremainsTransferObj.TransferToOrganizationId = anremainsTransferObj.TransferToLocationId = null
                    data.toLocation = await formatAddress(data.toLocation)
                    if (data.existingToAddressId) {
                        let loc = 'to location'
                        await checkAddressWithIdAndUpdate(data.existingToAddressId, data.toLocation, loc, t)
                    } else {
                        let address = await createAddress(data.toLocation)
                        anremainsTransferObj.TransferToAddressId = address.id
                    }
                }
                const result = await models.AnRemainsTransfer.update(anremainsTransferObj,
                    {
                        where:
                            { AnRemainsId: remainsId, Identifier: transferId },
                        transaction: t
                    }
                )
                return result
            })
            return outcome
        } else {
            throw new Error('Transfer is already completed for this record')
        }
    } catch (err) {
        throw err
    }
}

const createOrg = (data, t) => {
    return models.Organization.create(data, {
        include: [
            {
                model: models.Address
            },
            {
                model: models.OrganizationType
            }
        ]
    }, { transaction: t })
}

const createAddress = async (data, t) => {
    let result = await models.Address.create(data, { transaction: t })
    return result
}

const deleteExistingAddress = (id, t) => {
    return models.Address.destroy({ where: { id } }, { transaction: t })
}

const getAnremainsInfoTransferInputObject = async (transferObj, remainsId, userId) => {
    let anRemainsInfoTransferDataObj = {}
    for (let key in transferObj) {
        if (transferObj.hasOwnProperty(key)) {
            let fieldName = key[0].toUpperCase() + key.slice(1, key.length)
            anRemainsInfoTransferDataObj[fieldName] = transferObj[key]
        }
    }
    anRemainsInfoTransferDataObj.IsTransferComplete = transferObj.isTransferCompleted
    anRemainsInfoTransferDataObj.NeededDate = transferObj.neededByDateTime
    anRemainsInfoTransferDataObj.AnRemainsId = Number(remainsId)
    anRemainsInfoTransferDataObj.UpdatedBy = userId
    anRemainsInfoTransferDataObj.UpdatedAt = moment()
    if (transferObj.fromLocationTypeId === 1) {
        anRemainsInfoTransferDataObj.TransferFromLocationId = Number(transferObj.fromLocation)
        anRemainsInfoTransferDataObj.TransferFromAddressId = anRemainsInfoTransferDataObj.TransferFromOrganizationId = null
    }
    if (transferObj.fromLocationTypeId === 2) {
        if (typeof transferObj.fromLocation === 'number') {
            let organization = await models.Organization.findOne({
                where: {
                    id: transferObj.fromLocation
                }
            })
            if (organization) {
                anRemainsInfoTransferDataObj.TransferFromOrganizationId = transferObj.fromLocation
            } else {
                throw new Error('Selected Organization not found in the database for from location')
            }
        } else if (typeof transferObj.fromLocation === 'object') {
            anRemainsInfoTransferDataObj.TransferFromOrganization = {
                name: transferObj.fromLocation.name,
                organizationTypeId: transferObj.fromLocation.organizationTypeId,
                Address: formatAddress(transferObj.fromLocation.address)
            }
        }
        anRemainsInfoTransferDataObj.TransferFromAddressId = anRemainsInfoTransferDataObj.TransferFromLocationId = null
    }
    if (transferObj.toLocationTypeId === 1) {
        anRemainsInfoTransferDataObj.TransferToLocationId = Number(transferObj.toLocation)
        anRemainsInfoTransferDataObj.TransferToAddressId = anRemainsInfoTransferDataObj.TransferToOrganizationId = null
    }
    if (transferObj.toLocationTypeId === 2) {
        if (typeof transferObj.toLocation === 'number') {
            let organization = await models.Organization.findOne({
                where: {
                    id: transferObj.toLocation
                }
            })
            if (organization) {
                anRemainsInfoTransferDataObj.TransferToOrganizationId = transferObj.toLocation
            } else {
                throw new Error('Selected Organization not found in the database for Transfer to location')
            }
        } else {
            anRemainsInfoTransferDataObj.TransferToOrganization = {
                name: transferObj.toLocation.name,
                organizationTypeId: transferObj.toLocation.organizationTypeId,
                Address: formatAddress(transferObj.toLocation.address)
            }
        }
        anRemainsInfoTransferDataObj.TransferToAddressId = anRemainsInfoTransferDataObj.TransferToLocationId = null
    }
    return anRemainsInfoTransferDataObj
}

const checkAddressWithIdAndUpdate = async (id, addressObj, location, t) => {
    let address = await models.Address.findOne({
        where: {
            id: id
        }
    })
    if (address) {
        let newAddress = await models.Address.update(addressObj, {
            where: { id: id },
            transaction: t
        })
        return newAddress
    } else {
        throw new Error('Selected Address not found in the database for ' + location)
    }
}

module.exports = exports = {
    updateAnRemainsTransferInfo,
    checkAddressWithIdAndUpdate,
    deleteExistingAddress,
    createAddress,
    createOrg
}
