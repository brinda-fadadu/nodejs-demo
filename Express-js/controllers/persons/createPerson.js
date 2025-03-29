const models = require('../../models')
const { generateOnePortalId } = require('../../utils/dbGetFunctions')
const { formatAddress } = require('../../utils/addressValidation')
const _ = require('underscore')

exports.createPerson = async function (personData) {
    try {
        let personAddress, personIncludes
        personData.onePortalId = await generateOnePortalId()
        personData.isVerified = true
        personData.verifiedAt = Date.now()
        if (personData.address) {
            personData.address = await formatAddress(personData.address)
            personAddress = _.compact(_.values(personData.address))
            if (personAddress && personAddress.length > 0) {
                personData.PersonInformation = {}
                personData.PersonInformation.PersonAddress = personData.address
                personIncludes = {
                    include: [{
                        model: models.PersonInfo,
                        as: 'PersonInformation',
                        include: [{
                            model: models.Address,
                            as: 'PersonAddress'
                        }]
                    }]
                }
            } else {
                delete personData.address
            }
        }
        let result = await models.Person.create(personData, personIncludes)
        return result
    } catch (error) {
        throw error
    }
}
