const models = require('../../../../models/index')
const { createAddressInclude } = require('../../../../lib/commonIncludes')
const { formatAddress } = require('../../../../utils/addressValidation')

async function updateResidence (reqData, person, userId) {
    try {
        const id = person.PersonInformation.residentialAddressId
        const addressDetails = await formatAddress(reqData)
        let savedAddress
        await models.sequelize.transaction(async (t) => {
            if (id) {
                const existingAddress = await models.Address.findOne({
                    where: { id }
                }, t)
                existingAddress.set(addressDetails)
                savedAddress = await existingAddress.save({ transaction: t })
                person.PersonInformation.noOfYearsStayed = reqData.noOfYearsAtCountry
                await person.PersonInformation.save({ transaction: t })
                person.updatedBy = userId
                person.changed('updatedAt', true)
                await person.save({ transaction: t })
            } else {
                savedAddress = await models.Address.create(addressDetails, { transaction: t })
                await Object.assign(person.PersonInformation, { residentialAddressId: savedAddress.id, noOfYearsStayed: reqData.noOfYearsAtCountry })
                await person.PersonInformation.save({ transaction: t })
                person.updatedBy = userId
                person.changed('updatedAt', true)
                await person.save({ transaction: t })
            }
            return person
        })
        const result = await models.Person.findOne({
            where: { id: person.id },
            attributes: ['id', 'onePortalId'],
            include: [
                {
                    model: models.PersonInfo,
                    as: 'PersonInformation',
                    attributes: ['id', 'noOfYearsStayed'],
                    include: [...createAddressInclude('PersonAddress')]
                }
            ]
        })
        return result
    } catch (error) {
        throw error
    }
}

module.exports = exports = updateResidence
