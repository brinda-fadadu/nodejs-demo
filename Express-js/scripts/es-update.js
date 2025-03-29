const esOrganization = require('../es_models/organization')
const logger = require('../lib/logger')

async function addNewFields () {
    let orgs = []
    const docs = await esOrganization.client.search({
        index: esOrganization.indexName,
        body: {
            query: {
                match_all: {

                }
            }
        }
    })

    if (docs.hits.hits && docs.hits.hits.length) {
        docs.hits.hits.forEach(function (ele) {
            orgs.push(ele._source)
        })
    }

    orgs.forEach(ele => {
        ele.organizationTypeId = ele.organizationType.id
        esOrganization.client.update({
            index: esOrganization.indexName,
            id: ele.id,
            type: 'organization',
            body: {
                doc: ele
            }
        }, function (err, result) {
            if (err) {
                logger.log({
                    level: 'error',
                    message: err
                })
            }
        })
    })
}

addNewFields()
