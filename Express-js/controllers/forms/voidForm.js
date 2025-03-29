const models = require('../../models/index')
const logger = require('../../lib/logger')
const { docuSignClient } = require('../../services').docusign

async function voidForm (formId, personId, reqBody) {
    try {
        const person = await models.Person.findByPk(personId)
        if (!person) {
            throw new Error('PERSON_NOT_FOUND')
        }
        const caseInfoFormResult = await models.CaseInfoForm.findOne({ where: { formId, personId, envelopeId: reqBody.envelopeId } })
        if (!caseInfoFormResult) {
            throw new Error('CASEINFOFORM_NOT_FOUND')
        }
        const t = await models.sequelize.transaction()
        try {
            await models.CaseInfoForm.update({
                status: 'voided'
            }, { where: { id: caseInfoFormResult.id } })

            await docuSignClient.voidDocument(caseInfoFormResult.envelopeId, t)
            const caseInfoFormResultt = await models.CaseInfoForm.findOne({ where: { formId, personId, envelopeId: reqBody.envelopeId } })
            return caseInfoFormResultt
        } catch (error) {
            await t.rollback()
            console.log(error)
            logger.error(`Error while voiding form for particular OPI ${error}`)
            throw error
        }
    } catch (error) {
        console.log(error)
        logger.error(`Error while voiding form for particular OPI ${error}`)
        throw error
    }
}

module.exports = voidForm
