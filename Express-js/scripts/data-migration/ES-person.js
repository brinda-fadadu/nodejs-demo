// process.env.NODE_ENV = 'Migration'

const models = require('../../models/index')
const logger = require('../../lib/logger')
const _ = require('lodash')
const esPerson = require('../../es_models/person')

let hasSearchedFromES = false

async function migrateAllPersonES (job, done) {
    try {
        hasSearchedFromES = false
        let allEsPersonIds = []
        let allDbPersonIds = []
        let remainingIds = []
        if (!hasSearchedFromES) {
            const searchedPersons = await esPerson.client.search({
                index: esPerson.indexName,
                body: {
                    query: {
                        'bool': {
                            'must': [
                                {
                                    'match_all': {}
                                }
                            ],
                            'must_not': [],
                            'should': []
                        }
                    },
                    'from': 0,
                    'size': 10000,
                    'sort': [],
                    'aggs': {}
                }
            })
            allEsPersonIds = _.get(searchedPersons, 'hits.hits', []).map(ele => ele._source.id)
            const persons = await models.Person.findAll({ attributes: ['id'] })
            allDbPersonIds = persons.map(model => model.id)
            remainingIds = _.difference(allDbPersonIds, allEsPersonIds)
            hasSearchedFromES = true
        }
        let person
        if (remainingIds.length) {
            do {
                person = await models.Person.findOne({
                    where: {
                        id: remainingIds[0],
                        deletedAt: null,
                        deletedBy: null
                    }
                })
                if (person) {
                    await esPerson.save(person, {})
                }
                remainingIds.shift()
            } while (remainingIds.length)
        }
        done(null, { data: 'done' })
    } catch (error) {
        logger.error(error)
        done(error)
    }
}

async function migrateAllPersonESHandler (req, res, next) {
    try {
        const { queueNames, queues } = require('../../appQueues')
        const PersonESMigrationScheduleJob = queues[queueNames.PersonESMigrationScheduleJob]
        PersonESMigrationScheduleJob.add('PersonESMigrationScheduleJob')
        res.json({
            success: true
        })
    } catch (error) {
        res.json({
            success: false,
            error
        })
    }
}

module.exports = { migrateAllPersonES, migrateAllPersonESHandler }
