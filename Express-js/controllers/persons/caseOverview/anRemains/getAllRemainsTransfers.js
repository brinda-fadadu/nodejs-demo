const models = require('../../../../models')
const { createOrganizationInclude, /* createUserInclude , */ createAddressInclude, LocationIncludes } = require('../../../../lib/commonIncludes')

async function getAllRemainsTransfers (personId) {
    try {
        const anRemains = await models.AnRemainsInfo.findOne({
            where: {
                PersonId: personId
            },
            attributes: ['id']
        })
        if (anRemains) {
            const result = await models.AnRemainsTransfer.findAndCountAll({
                where: {
                    AnRemainsId: anRemains.id,
                    DeletedAt: null,
                    DeletedBy: null
                },
                order: [['UpdatedAt', 'desc']],
                include: [
                    // ...createUserInclude('CLPrimaryDriver'),
                    // ...createUserInclude('CLSecondaryDriver'),
                    ...createOrganizationInclude('TransferFromOrganization'),
                    ...createOrganizationInclude('TransferToOrganization'),
                    ...createAddressInclude('TransferFromAddress'),
                    ...createAddressInclude('TransferToAddress'),
                    ...LocationIncludes('TransferFromLocation'),
                    ...LocationIncludes('TransferToLocation')
                ],
                distinct: true
            })
            return result
        } else {
            throw new Error('Person not found')
        }
    } catch (err) {
        throw err
    }
}

module.exports = exports = getAllRemainsTransfers
