// process.env.NODE_ENV = 'Migration'

const models = require('../../models/index')
const logger = require('../../lib/logger')
const _ = require('lodash')
const esOrganization = require('../../es_models/organization')

let hasSearchedFromES = false

async function migrateAllOrganizationES (job, done) {
    try {
        hasSearchedFromES = false
        let allEsOrganizationIds = []
        let allDbOrganizationIds = []
        let remainingIds = []
        if (!hasSearchedFromES) {
            const searchedOrganization = await esOrganization.client.search({
                index: esOrganization.indexName,
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
            allEsOrganizationIds = _.get(searchedOrganization, 'hits.hits', []).map(ele => ele._source.organizationId)
            const organizations = await models.Organization.findAll({ attributes: ['id'], deletedAt: null, deletedBy: null })
            allDbOrganizationIds = organizations.map(model => model.id)
            remainingIds = _.difference(allDbOrganizationIds, allEsOrganizationIds)
            hasSearchedFromES = true
        }
        let place
        if (remainingIds.length) {
            do {
                place = await models.Place.findOne({
                    include: [
                        {
                            model: models.Organization,
                            as: 'organization',
                            where: {
                                id: remainingIds[0],
                                deletedAt: null,
                                deletedBy: null
                            }
                        }
                    ]
                })
                if (place) {
                    await esOrganization.save(place, {})
                    remainingIds.shift()
                }
            } while (remainingIds.length)
        }
        done(null, { data: 'done' })
    } catch (error) {
        logger.error(error)
        done(error)
    }
}

async function migrateAllOrganizationESHandler (req, res, next) {
    try {
        const { queueNames, queues } = require('../../appQueues')
        const OrganizationESMigrationScheduleJob = queues[queueNames.OrganizationESMigrationScheduleJob]
        OrganizationESMigrationScheduleJob.add('OrganizationESMigrationScheduleJob')
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

module.exports = { migrateAllOrganizationES, migrateAllOrganizationESHandler }
