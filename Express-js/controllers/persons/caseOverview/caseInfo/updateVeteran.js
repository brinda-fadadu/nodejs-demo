const models = require('../../../../models/index')
const logger = require('../../../../lib/logger')
const loweringObject = require('../../../../utils/loweringFirstLetter')

async function updateVeteran (reqBody, reqPerson) {
    try {
        const veteranId = reqPerson.PersonInformation.VeteranId
        const veteranDetails = {
            IsUnknown: reqBody.isUnknown,
            ServiceEra: reqBody.serviceEra,
            ServiceBranchId: reqBody.serviceBranchId
        }
        let veteranResult = {}

        if (veteranId) {
            /* If the veteran is created */
            const searchedVeteran = await models.Veteran.findOne({
                where: {
                    id: veteranId
                }
            })
            searchedVeteran.set(veteranDetails)
            veteranResult = await searchedVeteran.save()
        } else {
            /* If the veteran is not created */
            veteranResult = await models.Veteran.create(veteranDetails)
            reqPerson.PersonInformation.VeteranId = veteranResult.id
            await reqPerson.PersonInformation.save()
        }
        const result = loweringObject(veteranResult)
        return result
    } catch (error) {
        let errorMessage
        errorMessage = error.message || error
        logger.error(errorMessage)
        throw errorMessage
    }
}

module.exports = exports = updateVeteran
