const models = require('../../models')
const { updateExistingPerson } = require('../../controllers/Calls/CreateCall/subFunctions')
const { formatAddress } = require('../../utils/addressValidation')
const { generateOnePortalId } = require('../../utils/dbGetFunctions')

async function updatePerson (personData, personId) {
    if (!personData.person.isVerified) {
        personData.person.isVerified = true
        personData.person.onePortalId = await generateOnePortalId()
    }
    if (!personData.person.address) {
        await models.Person.update(
            personData.person, {
                where: {
                    id: personId
                }
            })
        let updatedPerson = await models.Person.findOne({
            where: {
                id: personId
            },
            include: [{
                model: models.PersonInfo,
                as: 'PersonInformation',
                include: [{
                    model: models.Address,
                    as: 'PersonAddress'
                }]
            }]
        })
        return updatedPerson
    } else {
        let address = {}
        personData.person.id = personId
        if (personData.person.address) {
            address = await formatAddress(personData.person.address)
        }
        let transaction = await models.sequelize.transaction()
        const updatedPerson = await updateExistingPerson(personData.person, {}, address, transaction)
        await transaction.commit()
        return updatedPerson
    }
}

module.exports = exports = updatePerson
