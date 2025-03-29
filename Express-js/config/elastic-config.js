var elasticsearch = require('elasticsearch')

const elasticSearchUrl =
    process.env.ELASTICSEARCH_URL || 'http://localhost:9200'

const esClient = new elasticsearch.Client({
    host: elasticSearchUrl,
    log: 'error'
})

if (['QA', 'test', 'app', 'appqa'].includes(process.env.NODE_ENV)) {
    esClient._refreshIndex = 'true'
}

module.exports = esClient
