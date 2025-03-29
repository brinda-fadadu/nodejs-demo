const models = require('../../models/index')
const logger = require('../../lib/logger')
const { createCaseInfoForm, deleteCaseInfoForms } = require('./caseInfoFormhelper')
const { docuSignClient } = require('../../services').docusign
const docuSignFormSender = require('./docuSignFormSender')

async function createFormPreview (formId, personId, reqData, user) {
    try {
        const person = await models.Person.findByPk(personId)

        if (!person) {
            throw new Error('PERSON_NOT_FOUND')
        }

        const form = await models.Form.findByPk(formId)

        if (!form) {
            throw new Error('FORM_NOT_FOUND')
        }

        // Check if form is already exists then update for and return

        let caseInfoForm

        try {
            caseInfoForm = await createCaseInfoForm(form, person, reqData, user, 'created')
            const sendResult = await docuSignFormSender.send(form, caseInfoForm, 'created')
            const url = await docuSignClient.generatePreviewUrl(sendResult.envelopeId)
            const result = caseInfoForm.toJSON()
            result.previewURL = url
            return result
        } catch (err) {
            await deleteCaseInfoForms(caseInfoForm)
            logger.error(`Error while (Inner catch block)create preview for forms and form recipients for particular OPI ${err}`)
            throw err
        }
    } catch (error) {
        logger.error(`Error while (Outer catch block)create preview for forms and form recipients for particular OPI ${error}`)
        throw error
    }
}

module.exports = createFormPreview
