const models = require('../../models/index')
const logger = require('../../lib/logger')

async function createCaseInfoForm (form, person, data, user, docStatus) {
    try {
    /* const existedDraftForm = await models.CaseInfoForm.findOne({
      where: {
        personId: person.id,
        formId: form.id,
        [Op.or]: [
          { status: { [Op.eq]: 'draft' } },
          { status: { [Op.eq]: 'created' } }
        ]
      }
    })
    if (apiName === 'sendAPI') {
      if (existedDraftForm) {
        await docuSignClient.updateStatusOfDocument(existedDraftForm.envelopeId)
        return existedDraftForm
      }
    } */
        // const docStatus = 'created'
        const caseInfoForm = {
            formId: form.id,
            personId: person.id,
            status: docStatus,
            createdBy: user.id,
            recipients: []
        }

        const employees = await models.Employee.findAll({
            where: { id: data.employees.map(e => e.id) },
            attributes: ['id']
        })

        employees.forEach(e => {
            caseInfoForm.recipients.push({
                employeeId: data.employees.find(v => v.id === e.id).id,
                status: docStatus,
                createdBy: user.id,
                formRecipientRoleId: data.employees.find(v => v.id === e.id).formRecipientRoleId
            })
        })

        const contacts = await person.getContactPeople({
            where: { id: data.contacts.map(c => c.id) },
            attributes: ['id']
        })

        contacts.forEach(c => {
            caseInfoForm.recipients.push({
                contactPersonId: c.id,
                status: docStatus,
                createdBy: user.id,
                formRecipientRoleId: data.contacts.find(v => v.id === c.id).formRecipientRoleId
            })
        })

        const result = await models.CaseInfoForm.create(caseInfoForm, {
            include: [{
                model: models.CaseInfoFormRecipient,
                as: 'recipients'
            }]
        })

        return result
    } catch (error) {
        logger.error(`Error while creating caseinfoform and caseinfoformrecipients from database ${error}`)
        throw error
    }
}

async function deleteCaseInfoForms (caseInfoForms) {
    try {
        if (!caseInfoForms) {
            return
        }

        // TODO: Cleanup if any docusign doc exist
        let ids

        if (Array.isArray(caseInfoForms)) {
            ids = caseInfoForms.map(v => v.id)
        } else {
            ids = caseInfoForms.id
        }

        await models.CaseInfoFormRecipient.destroy({
            where: {
                caseInfoFormId: ids
            }
        })
        await models.CaseInfoForm.destroy({
            where: {
                id: ids
            }
        })
    } catch (err) {
        logger.error(`Error while deleting caseinfoform and caseinfoformrecipients from database ${err}`)
        throw err
    }
}

module.exports = {
    createCaseInfoForm,
    deleteCaseInfoForms
}
