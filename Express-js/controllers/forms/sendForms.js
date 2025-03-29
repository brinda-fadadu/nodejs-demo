const models = require('../../models')
const logger = require('../../lib/logger')
const docusignWorker = require('../../workers/docuSignWorker')

const {
    createCaseInfoForm,
    deleteCaseInfoForms
} = require('./caseInfoFormhelper')
// const docuSignFormSender = require('./docuSignFormSender')

async function sendForms (personId, reqData, user) {
    try {
        const person = await models.Person.findByPk(personId)

        if (!person) {
            throw new Error('PERSON_NOT_FOUND')
        }

        const forms = await models.Form.findAll({
            where: {
                id: reqData.map(f => f.formId)
            }
        })

        if (!forms.length) {
            throw new Error('SEND_FORMS_LIST_EMPTY')
        }

        let caseInfoForms

        try {
            caseInfoForms = await Promise.all(
                reqData.map(formData => {
                    const form = forms.find(f => f.id === formData.formId)
                    return createCaseInfoForm(form, person, formData, user, 'sent')
                })
            )

            await Promise.all(
                caseInfoForms.map(caseInfoForm => {
                    // const form = forms.find(f => f.id === caseInfoForm.formId)
                    docusignWorker.addQueue(caseInfoForm)
                    return true
                    // return docuSignFormSender.send(form, caseInfoForm, 'sent')
                })
            )

            await Promise.all(caseInfoForms.map(f => f.reload()))
            return caseInfoForms
        } catch (err) {
            await deleteCaseInfoForms(caseInfoForms)
            logger.error(`Error while (Inner catch block)send forms and form recipients for particular OPI ${err}`)
            throw err
        }
    } catch (error) {
        logger.error(`Error while (Outer catch block)send forms and form recipients for particular OPI ${error}`)
        throw error
    }
}

module.exports = sendForms
