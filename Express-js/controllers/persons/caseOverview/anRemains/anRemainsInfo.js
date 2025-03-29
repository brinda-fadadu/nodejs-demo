const models = require('../../../../models')
const _ = require('underscore')

async function getAnRemainsInfo (id) {
    try {
        const anRemains = await models.AnRemainsInfo.findOne({
            where: {
                personId: id
            },
            include: [{
                model: models.Employee,
                as: 'Embalmer',
                attributes: ['id', 'Name', 'Email']
            }]
        })
        if (anRemains) {
            const anRemainsApproval = await anRemains.getCremationAndEmbalmingDetails({
                attributes: ['id', 'type', 'contactId'],
                include: [{
                    model: models.ContactPerson,
                    as: 'CremationAndEmblaming',
                    include: [{
                        model: models.Person,
                        as: 'PersonalInformation'
                    }]
                }]
            })
            const approvals = _.groupBy(anRemainsApproval, (ele) => {
                return ele.type
            })
            if (approvals.cremation) {
                approvals.cremation = approvals.cremation.map(ele => {
                    return {
                        id: ele.CremationAndEmblaming.id,
                        firstName: ele.CremationAndEmblaming.PersonalInformation.firstName,
                        lastName: ele.CremationAndEmblaming.PersonalInformation.lastName,
                        middleName: ele.CremationAndEmblaming.PersonalInformation.middleName
                    }
                })
            }
            if (approvals.embalming) {
                approvals.embalming = approvals.embalming.map(ele => {
                    return {
                        id: ele.CremationAndEmblaming.id,
                        firstName: ele.CremationAndEmblaming.PersonalInformation.firstName,
                        lastName: ele.CremationAndEmblaming.PersonalInformation.lastName,
                        middleName: ele.CremationAndEmblaming.PersonalInformation.middleName
                    }
                })
            }
            const result = anRemains.toJSON()
            result.cremationApprovedBy = approvals.cremation || []
            result.embalmingApprovedBy = approvals.embalming || []
            return result
        } else {
            throw new Error('AnRemains not found')
        }
    } catch (error) {
        throw error
    }
}

module.exports = exports = getAnRemainsInfo
