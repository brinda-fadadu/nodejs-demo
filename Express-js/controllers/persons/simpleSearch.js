const esPerson = require('../../es_models/person')
const logger = require('../../lib/logger')

async function simpleSearch (req) {
    req.query.page = Number(req.query.page)
    req.query.limit = Number(req.query.limit)
    let limit = req.query.limit ? req.query.limit : 10
    try {
        let boolQuery = {
            must: {
                multi_match: {
                    query: req.query.q,
                    type: 'cross_fields',
                    fields: ['onePortalId', 'firstName', 'middleName', 'lastName', 'phoneNumber', 'secondaryPhoneNumber'],
                    operator: 'and'
                }
            }
        }
        if (req.query.isVerified) {
            boolQuery.filter = {
                term: {
                    isVerified: req.query.isVerified === 'true'
                }
            }
        }
        const searchResults = await esPerson.client.search({
            index: esPerson.indexName,
            body: {
                from: req.query.page ? (req.query.page - 1) * limit : 0,
                size: limit,
                query: {
                    bool: boolQuery
                }
            }
        })
        const result = {
            totalResults: searchResults.hits.total,
            results: searchResults.hits.hits.map(ele => ele._source)
        }
        return result
    } catch (error) {
        logger.error(error.message)
        logger.error(error)
    }
}

module.exports = simpleSearch
