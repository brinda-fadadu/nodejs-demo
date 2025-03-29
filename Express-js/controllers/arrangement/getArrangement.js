const models = require('../../models')

exports.getArrangement = async function (arrangementId, type) {
    try {
        let arrangement = await models.Arrangement.findOne({
            where: {
                id: arrangementId
            }
        })
        if (arrangement) {
            arrangement = arrangement.toJSON()
            let notes = await getNotesFromCalls(arrangement.PersonId)
            arrangement.notes = notes
            // TODO Need to add contact, nokPerson, cemeteryContracts, funeralStatements
            return arrangement
        } else {
            throw new Error('ARRANGEMENT_NOT_FOUND')
        }
    } catch (error) {
        throw error
    }
}

async function getNotesFromCalls (personId) {
    let someOnePassed = await models.SomeOnePassed.findAll({
        where: {
            decedentId: personId
        },
        attributes: ['id', 'CallId']
    })

    let preNeed = await models.PreArrangementReason.findAll({
        where: {
            beneficiaryId: personId
        },
        attributes: ['id', 'CallId']
    })

    let gn = await models.GeneologySearchReason.findAll({
        where: {
            decedentId: personId
        },
        attributes: ['id', 'CallId']
    })

    const callIds = []
    someOnePassed.forEach(reason => callIds.push(reason.CallId))
    preNeed.forEach(reason => callIds.push(reason.CallId))
    gn.forEach(reason => callIds.push(reason.CallId))

    let notes = await models.Note.findAll({
        where: {
            ResourceId: callIds
        },
        order: [
            [
                'UpdatedAt',
                'DESC'
            ]
        ]
    })
    return notes
}
