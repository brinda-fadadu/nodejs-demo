const models = require('../../models/index')
const logger = require('../../lib/logger')
const { docuSignClient } = require('../../services').docusign
const Sequelize = require('sequelize')
const Op = Sequelize.Op

async function downloadForm (envelopeId, personId, res) {
    try {
        const person = await models.Person.findByPk(personId)
        if (!person) {
            throw new Error('PERSON_NOT_FOUND')
        }
        const caseInfoFormResult = await models.CaseInfoForm.findOne({
            where: {
                [Op.and]: [{ personId, envelopeId }]
            }
        })
        if (!caseInfoFormResult) {
            throw new Error('CASEINFOFORM_NOT_FOUND')
        }
        try {
            const downloadedResult = await docuSignClient.downloadDocument(envelopeId)
            downloadedResult.pipe(res)
        } catch (error) {
            console.log(error)
            logger.error(`Error while downloading form for particular OPI ${error}`)
            throw error
        }
    } catch (error) {
        console.log(error)
        logger.error(`Error while downloading form for particular OPI ${error}`)
        throw error
    }
}

module.exports = downloadForm
