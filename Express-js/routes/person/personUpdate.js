const VerifiedPersonController = require('../../controllers/refactorControllers/personController/verifiedPersonController')
const { sendErrorResponse } = require('../../lib/errorResponse')
const { customResponse } = require('../../lib/custom-response')
const _ = require('lodash')
const models = require('../../models/index')

async function updatePerson (req, res, next) {
    let transaction
    let personDetails
    try {
        transaction = await models.sequelize.transaction()
        const personId = req.params.personId
        const addressPlace = _.get(req.body, 'personInformation.addressPlace')
        const personType = _.get(req.body, 'personType')
        if (addressPlace && !_.isEmpty(addressPlace.organization)) {
            throw new Error('ORGANIZATION_PERSON_NOT_ALLOWED')
        }
        const verifiedPersonController = new VerifiedPersonController(personId)
        personDetails = await verifiedPersonController.verifyPerson(req.body.person, personType, transaction)
        if (!req.body.person.apiType) {
            personDetails = await verifiedPersonController.getVerifiedPerson(transaction)
        }
        await transaction.commit()
        customResponse(200, personDetails, res)
    } catch (error) {
        await transaction.rollback()
        sendErrorResponse(error, res)
    }
}
module.exports = exports = updatePerson
