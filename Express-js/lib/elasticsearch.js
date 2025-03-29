const esPerson = require('../es_models/person')
const esOrganization = require('../es_models/organization')
const esAgreement = require('../es_models/agreement')

module.exports = function () {
    esPerson.createIndexAndMapping()
    esOrganization.createIndexAndMapping()
    esAgreement.createIndexAndMapping()
}
