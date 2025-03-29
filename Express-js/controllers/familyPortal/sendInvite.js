const faaWorker = require('../../workers/faa_worker/CallFaaWorker')
const models = require('../../models')

exports.sendInvitation = async (queryObj, email) => {
    let transaction = await models.sequelize.transaction()
    try {
        let familyAdvisor = await models.SomeOnePassed.findOne({
            attributes: ['id', 'decedentId', 'arrangerEmail'],
            include: [
                {
                    model: models.Person,
                    as: 'decedent',
                    attributes: ['onePortalId'],
                    where: queryObj
                }
            ],
            distinct: true
        })
        if (email !== familyAdvisor.arrangerEmail) {
            await models.SomeOnePassed.update({
                arrangerEmail: email
            }, {
                where: { id: familyAdvisor.id },
                transaction
            })
        }
        faaWorker.addQueue({ email, faaWorker_event: 'sendInvitation' })
        await models.Person.update({
            isFaaInvitationSend: true
        }, {
            where: { id: familyAdvisor.decedentId },
            transaction
        })
        await transaction.commit()
        return ({
            message: 'OK'
        })
    } catch (err) {
        await transaction.rollback()
        throw err
    }
}
