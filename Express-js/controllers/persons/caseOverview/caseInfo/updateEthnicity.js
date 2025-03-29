const models = require('../../../../models/index')
const logger = require('../../../../lib/logger')
const loweringObject = require('../../../../utils/loweringFirstLetter')

async function updateEthnicityDetails (reqBody, reqPerson) {
    try {
        const ethnicityId = reqPerson.PersonInformation.ethnicityId
        const ethnicityDetails = {
            raceOneId: reqBody.raceOneId,
            raceTwoId: reqBody.raceTwoId,
            hispanicId: reqBody.hispanicId,
            isHispanic: reqBody.isHispanic,
            raceThreeId: reqBody.raceThreeId,
            ethnicityOneId: reqBody.ethnicityOneId,
            ethnicityTwoId: reqBody.ethnicityTwoId,
            ethnicityThreeId: reqBody.ethnicityThreeId
        }
        let ethnicityResult = {}
        const searchedEthnicity = await models.PersonEthnicity.findOne({
            where: {
                id: ethnicityId
            }
        })
        if (ethnicityId && searchedEthnicity) {
            /* If the ethnicity is created */
            searchedEthnicity.set(ethnicityDetails)
            ethnicityResult = await searchedEthnicity.save()
        } else {
            /* If the ethnicity is not created */
            ethnicityResult = await models.PersonEthnicity.create(ethnicityDetails)
            reqPerson.PersonInformation.ethnicityId = ethnicityResult.id
            await reqPerson.PersonInformation.save()
        }
        const result = loweringObject(ethnicityResult)
        return result
    } catch (error) {
        let errorMessage
        errorMessage = error.message || error
        logger.error(errorMessage)
        throw errorMessage
    }
}

module.exports = exports = updateEthnicityDetails
