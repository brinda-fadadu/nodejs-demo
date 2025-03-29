const logger = require('../../../../lib/logger')

async function updateEducationDetails (reqBody, reqPerson) {
    try {
        reqPerson.PersonInformation.industry = reqBody.industry
        reqPerson.PersonInformation.occupation = reqBody.occupation
        reqPerson.PersonInformation.qualificationId = reqBody.qualificationId
        reqPerson.PersonInformation.yearsOfOccupation = reqBody.yearsOfOccupation
        await reqPerson.PersonInformation.save()
        return {
            industry: reqPerson.PersonInformation.industry,
            occupation: reqPerson.PersonInformation.occupation,
            qualificationId: reqPerson.PersonInformation.qualificationId,
            yearsOfOccupation: reqPerson.PersonInformation.yearsOfOccupation
        }
    } catch (error) {
        let errorMessage
        errorMessage = error.message || error
        logger.error(errorMessage)
        throw errorMessage
    }
}

module.exports = exports = updateEducationDetails
