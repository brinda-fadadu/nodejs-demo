const esPerson = require('../../es_models/person')
const logger = require('../../lib/logger')

async function advanceSearch (req) {
    try {
        let reqObj = req.body
        let limit = reqObj.limit ? reqObj.limit : 100
        const mainCondition = reqObj.matchCriteria === 'all' ? 'must' : 'should'

        let subQuery = []
        reqObj.fieldCriterias.map((e) => {
            switch (e.field) {
            case 'simpleSearch':
                subQuery.push({
                    'multi_match': {
                        'query': e.value,
                        'type': 'cross_fields',
                        'fields': ['onePortalId', 'firstName', 'middleName', 'lastName'],
                        'operator': 'and'
                        // 'fuzziness': 'AUTO'  // it will search for duplicate spellings like if we want to search 'kalm' and actual word is 'calm' then with this option we will get result as 'calm'
                    }
                })
                break
            case 'address':
                subQuery.push({
                    'nested': {
                        'path': 'address',
                        'score_mode': 'max',
                        'query': {
                            'bool': {
                                'should': [
                                    { 'match': { 'address.line1': e.value } },
                                    { 'match': { 'address.line2': e.value } },
                                    { 'match': { 'address.zipcode': e.value } },
                                    { 'match': { 'address.city': e.value } },
                                    { 'match': { 'address.state': e.value } },
                                    { 'match': { 'address.country': e.value } }
                                ]
                            }
                        }
                    }
                })
                break
            case 'phone':
                if (e.condition === 'contains') {
                    subQuery.push({
                        'wildcard': {
                            'phoneNumber': {
                                'value': `*${e.value}*`,
                                'boost': 1.0
                            }
                        }
                    })
                } else {
                    subQuery.push({
                        'match': {
                            'phoneNumber': e.value
                        }
                    })
                }
                break
            case 'birthDate':
                subQuery.push({
                    'range': {
                        'dateOfBirth':
                        {
                            'gte': e.value.startDate,
                            'lte': e.value.endDate
                        }
                    }
                })
                break
            case 'deathDate':
                subQuery.push({
                    'range': {
                        'dateOfDeath':
                        {
                            'gte': e.value.startDate,
                            'lte': e.value.endDate
                        }
                    }
                })
                break
            case 'callDate':
                subQuery.push({
                    'range': {
                        'createdAt':
                        {
                            'gte': e.value.startDate,
                            'lte': e.value.endDate
                        }
                    }
                })
                break
            case 'serviceDate':
            // TODO: after services module update elastic index w.r.to.. serviceDate
                subQuery.push({
                    'range': {
                        'serviceDate':
                        {
                            'gte': e.value.startDate, // moment(e.value.startDate).toISOString(),
                            'lte': e.value.endDate // moment(e.value.endDate).toISOString()
                        }
                    }
                })
                break
            default:
                break
            }
        })

        let query = {
            'bool': {
                [mainCondition]: subQuery
            }
        }
        if (reqObj.isVerified === true || reqObj.isVerified === false) {
            query.bool.filter = {
                'term': {
                    'isVerified': reqObj.isVerified
                }
            }
        }
        if (mainCondition === 'should') {
            query.bool.minimum_should_match = 1
        }

        const searchResults = await esPerson.client.search({
            index: esPerson.indexName,
            body: {
                from: reqObj.page ? (reqObj.page - 1) * limit : 0,
                size: limit,
                query: query
            }
        })
        return {
            totalResults: searchResults.hits.total,
            results: searchResults.hits.hits.map(v => v._source)
        }
    } catch (error) {
        logger.error(error.message)
        throw error
    }
}

module.exports = advanceSearch
