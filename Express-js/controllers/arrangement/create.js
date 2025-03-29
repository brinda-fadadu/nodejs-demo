const logger = require('../../lib/logger')
const util = require('../../lib/util')
const models = require('../../models/index')
const seedValues = require('../../config/seed')
let arrangementTypes = seedValues.seed.ArrangementType

exports.createArrangement = async function (data) {
    try {
        let person = await models.Person.findOne({
            where: {
                onePortalId: data.onePortalId
            }
        })
        if (person) {
            let arrangementType // = util.getKey(arrangementTypes, 'AN')
            // if (person.isPNTurnAN) {
            //     arrangementType = util.getKey(arrangementTypes, 'PN Turn AN')
            // }

            if (person.isAlive) {
                arrangementType = util.getKey(arrangementTypes, 'PN')
            } else {
                arrangementType = util.getKey(arrangementTypes, 'AN')
            }
            let existingArrangement = await models.Arrangement.findOne({
                where: {
                    PersonId: person.id
                }
            })
            if (existingArrangement) {
                throw new Error('ARRANGEMENT_ALREADY_CREATED')
            } else {
                let result = await createArrangement(person.id, arrangementType, data.userId)
                return result
            }
        } else {
            throw new Error('PERSON_NOT_AVAILABLE')
        }
    } catch (error) {
        logger.error(error)
        throw error
    }
}

async function createArrangement (personId, arrangementType, userId) {
    let arrangement = {
        'PersonId': personId,
        'ArrangementType': arrangementTypes[arrangementType],
        'CreatedBy': userId
    }
    let result = await models.Arrangement.create(arrangement)
    return result
}
