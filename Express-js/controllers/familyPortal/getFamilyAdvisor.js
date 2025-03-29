const models = require('../../models')

exports.getFamilyAdvisor = async (queryObj) => {
    try {
        let familyAdvisor = await models.SomeOnePassed.findOne({
            attributes: ['id', 'arrangerEmail'],
            include: [
                {
                    model: models.Person,
                    as: 'decedent',
                    attributes: ['onePortalId', 'isFaaInvitationSend'],
                    where: queryObj
                }
            ],
            distinct: true
        })
        return {
            advisor: familyAdvisor.arrangerEmail,
            isFaaInvitationSend: familyAdvisor.decedent.isFaaInvitationSend
        }
    } catch (err) {
        throw err
    }
}
