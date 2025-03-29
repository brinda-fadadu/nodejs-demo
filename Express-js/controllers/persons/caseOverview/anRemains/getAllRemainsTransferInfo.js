const models = require('../../../../models')
const { createOrganizationInclude, createUserInclude } = require('../../../../lib/commonIncludes')

async function getAnRemainsInfoTransferInfo (matchCriteria) {
    try {
        let getTransfersQuery = {
            where: matchCriteria,
            include: [
                ...createUserInclude('CreatedUser'),
                ...createUserInclude('UpdatedUser'),
                ...createOrganizationInclude('TransferFrom'),
                ...createOrganizationInclude('TransferTo'),
                {
                    model: models.Employee,
                    as: 'PrimaryDriverDetails',
                    attributes: ['id', 'Name', 'Email']
                },
                {
                    model: models.Employee,
                    as: 'SecondaryDriverDetails',
                    attributes: ['id', 'Name', 'Email']
                }
            ]
        }

        const result = await models.AnRemainsTransfer.findOne(getTransfersQuery)
        return result
    } catch (err) {
        throw err
    }
}

module.exports = exports = getAnRemainsInfoTransferInfo
