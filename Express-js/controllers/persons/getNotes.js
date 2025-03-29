const models = require('../../models')

async function getNotesFromCalls (personId) {
    let calls = await models.Call.findAll({
        where: {
            CallerId: personId
        },
        attributes: ['id']
    })

    let someOnePassed = await models.SomeOnePassed.findAll({
        where: {
            DecedentId: personId
        },
        attributes: ['id', 'CallId']
    })

    let preNeed = await models.PreArrangementReason.findAll({
        where: {
            BeneficiaryId: personId
        },
        attributes: ['id', 'CallId']
    })

    let gn = await models.GeneologySearchReason.findAll({
        where: {
            DecedentId: personId
        },
        attributes: ['id', 'CallId']
    })

    const callIds = []
    calls.forEach(call => callIds.push(call.id))
    someOnePassed.forEach(reason => callIds.push(reason.CallId))
    preNeed.forEach(reason => callIds.push(reason.CallId))
    gn.forEach(reason => callIds.push(reason.CallId))

    let notes = await models.Note.findAll({
        where: {
            ResourceId: callIds
        },
        include: [
            {
                model: models.User,
                as: 'CreatedUser'
            },
            {
                model: models.NoteCategory,
                as: 'NoteCategory'
            }
        ],
        order: [['UpdatedAt', 'DESC']]
    })
    return notes
}

module.exports = exports = getNotesFromCalls
