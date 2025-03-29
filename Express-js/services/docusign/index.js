const path = require('path')

const env = process.env.NODE_ENV || 'development'
const config = require('../../config/docusign-config')[env]
const DocuSignClient = require('./docuSignClient')

const docuSignClient = new DocuSignClient(
    config,
    `${path.join(__dirname)}/../../config/${config.key_name}`
)

exports.docuSignClient = docuSignClient
