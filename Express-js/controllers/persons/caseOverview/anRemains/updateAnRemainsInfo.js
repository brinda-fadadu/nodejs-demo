const models = require('../../../../models')

async function updateAnRemainsInfo (personId, anRemainsInfoId, anRemainsData, userData) {
    try {
        anRemainsData = await getAnremainsInfoInputObject(anRemainsData, userData.id)
        let outcome = await models.sequelize.transaction(async (t) => {
            let result = await models.AnRemainsInfo.update(anRemainsData, { where: { id: anRemainsInfoId, PersonId: personId } }, { transaction: t })
            if (result[0] === 1) {
                let anRemainsInfo = await models.AnRemainsInfo.findOne({ where: { id: anRemainsInfoId }, transaction: t })
                let CremationAndEmbalmingDetails = []
                if (!anRemainsData.embalmingSelfApproved) {
                    CremationAndEmbalmingDetails.push({
                        anRemainsInfoId: anRemainsInfo.id,
                        type: 'embalming',
                        contactId: anRemainsData.embalmingApprovedByContactIds
                    })
                }
                if (!anRemainsData.cremationSelfApproved) {
                    anRemainsData.cremationApprovedByContactIds.map((cUserId) => {
                        CremationAndEmbalmingDetails.push({
                            anRemainsInfoId: anRemainsInfo.id,
                            type: 'cremation',
                            contactId: cUserId
                        })
                    })
                }
                await models.AnRemainsApproval.destroy({
                    where: {
                        anRemainsInfoId: anRemainsInfoId
                    }
                })
                await models.AnRemainsApproval.bulkCreate(CremationAndEmbalmingDetails, { transaction: t })
                // await anRemainsInfo.setCremationAndEmbalmingDetails(CremationAndEmbalmingDetails, { transaction: t })
                return result
            } else {
                return result
            }
        })
        return outcome
    } catch (error) {
        throw error
    }
}

const getAnremainsInfoInputObject = async (infoObj, userId) => {
    infoObj.createdBy = userId
    infoObj.updatedBy = userId
    return infoObj
}
module.exports = exports = updateAnRemainsInfo
