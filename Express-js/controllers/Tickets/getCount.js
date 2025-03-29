const models = require('../../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

async function getQueryResult (whereQueryInput, attributesAndGroupFieldsInput, reasonValue, locationIds) {
    try {
        let reason = reasonValue ? Number(reasonValue) : [3, 5]
        let whereQuery = { Reason: reason }
        if (locationIds) {
            whereQuery.ReceivedLocationId = locationIds
        }
        const countResult = await models.Ticket.count({
            where: whereQueryInput,
            include: [{
                model: models.Call,
                attributes: ['id', 'Reason'],
                as: 'Deceded',
                where: whereQuery
            }],
            attributes: attributesAndGroupFieldsInput,
            group: attributesAndGroupFieldsInput
        })
        return countResult
    } catch (err) {
        console.log(err)
        throw err
    }
}

const attributesAndGroupFieldsInput = ['Deceded.Reason', 'Status']
exports.getCount = async function (locationIds) {
    try {
        const getCountResult = await getQueryResult({ Status: [1, 2, 3, 4], Archived: false }, attributesAndGroupFieldsInput, null, locationIds)
        return getCountResult
    } catch (err) {
        console.log(err)
        throw err
    }
}

exports.getOverDueCount = async function (locationIds) {
    try {
        const overDueTicketCount = await getQueryResult({
            [Op.and]: [{ Status: [1, 2, 4] }, { dueDate: { [Op.lt]: new Date() } }],
            Archived: false
        }, attributesAndGroupFieldsInput, null, locationIds)
        return overDueTicketCount
    } catch (err) {
        console.log(err)
        throw err
    }
}

exports.getArchiveCount = async function (locationIds) {
    try {
        const archiveCount = await getQueryResult({ Archived: true }, attributesAndGroupFieldsInput, null, locationIds)
        return archiveCount
    } catch (err) {
        console.log(err)
        throw err
    }
}

exports.getPriorityCounts = async function (type, status, callId, locationIds) {
    try {
        let matchCriteria
        const attributesAndGroupFieldsInput = ['Deceded.Reason', 'Status', 'Priority']

        if (Number(status) < 5) {
            matchCriteria = { Status: Number(status), Archived: false }
        } else if (Number(status) === 5) { // overdue counts
            matchCriteria = {
                [Op.and]: [{ Status: [1, 2, 4] }, { dueDate: { [Op.lt]: new Date() } }],
                Archived: false
            }
        } else if (Number(status) === 6) {
            matchCriteria = {
                Archived: true
            }
        } else if (Number(status) === 7) {
            if (callId) {
                matchCriteria = { CallId: callId, Archived: false }
            } else {
                matchCriteria = { Archived: false }
            }
        }

        const countResult = await getQueryResult(matchCriteria, attributesAndGroupFieldsInput, type, locationIds)
        return countResult
    } catch (err) {
        console.log(err)
        throw err
    }
}
