const models = require('../../../../models')
const { formatAddress } = require('../../../../utils/addressValidation')

const moment = require('moment')

async function createAnremainsInfoTransfer (personId, transferObj, userId) {
    try {
        const anRemainsInfo = await models.AnRemainsInfo.findOne({
            where: {
                personId: personId
            }
        })
        const anRemainsInfoId = anRemainsInfo.id
        let anremainsTransferObj = await getAnremainsInfoTransferInputObject(anRemainsInfoId, transferObj, userId)
        let includeObj = [{
            model: models.AnRemainsInfo
        }]
        if (transferObj.fromLocationTypeId === 2 && typeof transferObj.fromLocation === 'object') {
            includeObj.push({
                model: models.Organization,
                include: [{
                    model: models.OrganizationType
                }, {
                    model: models.Address
                }],
                as: 'TransferFromOrganization'
            })
        } else if (transferObj.fromLocationTypeId === 3) {
            includeObj.push({
                model: models.Address,
                as: 'TransferFromAddress'
            })
        }
        if (transferObj.toLocationTypeId === 2 && typeof transferObj.toLocation === 'object') {
            includeObj.push({
                model: models.Organization,
                include: [{
                    model: models.OrganizationType
                }, {
                    model: models.Address
                }],
                as: 'TransferToOrganization'
            })
        } else if (transferObj.toLocationTypeId === 3) {
            includeObj.push({
                model: models.Address,
                as: 'TransferToAddress'
            })
        }
        let result = await models.AnRemainsTransfer.create(anremainsTransferObj, {
            include: includeObj
        })
        return result
    } catch (error) {
        throw error
    }
}

const getAnremainsInfoTransferInputObject = async (anRemainsInfoId, transferObj, userId) => {
    let anRemainsInfoTransferDataObj = {}
    anRemainsInfoTransferDataObj.PrimaryDriverId = transferObj.primaryDriverId
    anRemainsInfoTransferDataObj.SecondaryDriverId = transferObj.secondaryDriverId || null
    anRemainsInfoTransferDataObj.FromLocationTypeId = transferObj.fromLocationTypeId
    anRemainsInfoTransferDataObj.ToLocationTypeId = transferObj.toLocationTypeId
    anRemainsInfoTransferDataObj.AnRemainsId = Number(anRemainsInfoId)
    anRemainsInfoTransferDataObj.CreatedBy = userId
    anRemainsInfoTransferDataObj.UpdatedBy = userId
    anRemainsInfoTransferDataObj.CreatedAt = moment()
    anRemainsInfoTransferDataObj.UpdatedAt = moment()
    anRemainsInfoTransferDataObj.TransferDateTime = transferObj.transferDateTime
    anRemainsInfoTransferDataObj.NeededDate = transferObj.neededByDateTime
    anRemainsInfoTransferDataObj.TransferType = transferObj.transferType
    anRemainsInfoTransferDataObj.IsTransferReady = transferObj.isTransferReady
    anRemainsInfoTransferDataObj.IsTransferComplete = transferObj.isTransferCompleted
    if (transferObj.fromLocationTypeId === 1) {
        anRemainsInfoTransferDataObj.TransferFromLocationId = Number(transferObj.fromLocation)
    }
    if (transferObj.fromLocationTypeId === 3) {
        anRemainsInfoTransferDataObj.TransferFromAddress = await formatAddress(transferObj.fromLocation)
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
                Address: await formatAddress(transferObj.fromLocation.address)
            }
        }
    }
    if (transferObj.toLocationTypeId === 1) {
        anRemainsInfoTransferDataObj.TransferToLocationId = Number(transferObj.toLocation)
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
                Address: await formatAddress(transferObj.toLocation.address)
            }
        }
    }
    if (transferObj.toLocationTypeId === 3) {
        anRemainsInfoTransferDataObj.TransferToAddress = await formatAddress(transferObj.toLocation)
    }
    return anRemainsInfoTransferDataObj
}

module.exports = {
    createAnremainsInfoTransfer,
    getAnremainsInfoTransferInputObject
}
