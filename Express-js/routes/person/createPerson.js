const { customResponse } = require('../../lib/custom-response')
const logger = require('../../lib/logger')
const _ = require('lodash')
const PersonController = require('../../controllers/refactorControllers/personController/personController')
const VerifiedPersonController = require('../../controllers/refactorControllers/personController/verifiedPersonController')
const models = require('../../models')

async function createPersonHandler (req, res) {
    let transaction
    try {
        // adding isVerified key because when we are creating a new person or updating the unVerified person in lookup, the person needs to be verified
        req.body.userId = req.currentUser.id
        const reqBody = {
            ...req.body
        }
        transaction = await models.sequelize.transaction()
        const createdPerson = await PersonController.createOrUpdate(reqBody, {}, {}, transaction)
        if (createdPerson) {
            reqBody.id = createdPerson.id
        }
        if (_.get(reqBody, 'personVerificationDetails')) {
            reqBody.ssn = _.get(reqBody, 'personVerificationDetails.ssn')
        }
        const personType = !reqBody.isAlive ? 'decedent' : null
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(reqBody, personType, transaction)
        const personDetails = await verifiedPersonController.getVerifiedPerson(transaction)
        await transaction.commit()
        customResponse(201, personDetails, res)
    } catch (error) {
        await transaction.rollback()
        logger.error(`Person creation failed: ${error}`)
        customResponse(400, error, res)
    }
}

module.exports = createPersonHandler
