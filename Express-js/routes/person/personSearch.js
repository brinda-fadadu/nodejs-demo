const esPerson = require('../../es_models/person')
const logger = require('../../lib/logger')
// const router = require('express').Router()

function nestedAddress (address) {
    const nestedShould = []
    const addressLineFields = ['line1', 'line2']

    addressLineFields.forEach(field => {
        if (address[field]) {
            nestedShould.push({
                'match': {
                    [`address.${field}`]: address[field]
                }
            })
        }
    })

    return nestedShould
}

function buildSearchQuery (req) {
    const esQuery = {
        should: [],
        filter: [{
            'term': {
                isVerified: true
            }
        }],
        minimum_should_match: 1
    }

    if (!req) {
        return esQuery
    }

    const personFields = ['firstName', 'lastName', 'middleName', 'phoneNumber', 'ssnLastFour']

    personFields.forEach(field => {
        if (req[field]) {
            esQuery.should.push({
                query_string: {
                    default_field: field,
                    query: req[field]
                }
            })
        }
    })

    const rangeFields = ['dateOfBirth', 'dateOfDeath']

    rangeFields.forEach((field) => {
        if (req[field]) {
            esQuery.should.push({
                range: {
                    [field]: {
                        gte: req[field].startDate,
                        lte: req[field].endDate
                    }
                }
            })
        }
    })

    if (req.address) {
        const nestedShould = nestedAddress(req.address)
        esQuery.should = [
            ...esQuery.should,
            ...nestedShould
        ]
    }

    return esQuery
}

async function searchPerson (req, res, next) {
    const esQuery = req.body.oldApi
        ? buildSearchQueryOld(req.body) : buildSearchQuery(req.body)

    // If no search criteria present then return empty.
    if ((req.body.oldApi && !esQuery.must.length) ||
        (!req.body.oldApi && !esQuery.should.length)) {
        res.status(200).json({
            totalResults: 0,
            persons: []
        })
        return
    }

    try {
        const searchResults = await esPerson.client.search({
            index: esPerson.indexName,
            body: {
                query: {
                    bool: esQuery
                },
                sort: [req.body.oldApi ? {} : { '_score': 'desc' }]
            }
        })

        const result = {
            totalResults: searchResults.hits.total,
            persons: searchResults.hits.hits.map(v => v._source)
        }

        res.status(200).json(result)
    } catch (error) {
        logger.error(error.message)
        logger.error(error)
        next(error)
    }
}

module.exports = searchPerson

function buildSearchQueryOld (req) {
    const esQuery = {
        must: [],
        filter: []
    }

    if (!req) {
        return esQuery
    }

    const personFields = ['firstName', 'lastName', 'middleName']

    personFields.forEach(field => {
        if (req[field]) {
            esQuery.must.push({
                query_string: {
                    default_field: field,
                    query: req[field]
                }
            })
        }
    })

    if (req.dateOfBirth) {
        esQuery.must.push({
            range: {
                dateOfBirth: {
                    gte: req.dateOfBirth.startDate,
                    lte: req.dateOfBirth.endDate
                }
            }
        })
    }

    if (!req.address) {
        return esQuery
    }

    const addressLineFields = ['line1', 'line2', 'line3']

    addressLineFields.forEach(field => {
        if (req.address[field]) {
            esQuery.must.push({
                nested: {
                    path: 'address',
                    query: {
                        match_phrase_prefix: {
                            [`address.${field}`]: req.address[field]
                        }
                    }
                }
            })
        }
    })

    const addressFields = ['city', 'state', 'country', 'zipcode']

    addressFields.forEach(field => {
        if (req.address[field]) {
            esQuery.filter.push({
                nested: {
                    path: 'address',
                    query: {
                        match: {
                            [`address.${field}`]: String(req.address[field])
                        }
                    }
                }
            })
        }
    })

    return esQuery
}
