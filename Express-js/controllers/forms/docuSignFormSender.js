const { docuSignClient, Forms } = require('../../services').docusign
const logger = require('../../lib/logger')

async function send (form, caseinfoForm, status, t) {
    try {
        let docuSignForm
        let caseinfoData = { caseInfoFormId: caseinfoForm.id }
        // NOTE: add internal field name for comparision in FORM model
        switch (form.title) {
        case 'Release Authorization':
            docuSignForm = new Forms.ReleaseAuthorizationForm(caseinfoData)
            break
        case 'Witness of Removal':
            docuSignForm = new Forms.WitnessOfRemovalForm(caseinfoData)
            break
        case 'Authorization to Accept or Decline Embalming':
            docuSignForm = new Forms.EmbalmingForm(caseinfoData)
            break
        case 'Affidavit of Disposition of Control Over Remains':
            docuSignForm = new Forms.DispositionForm(caseinfoData)
            break
        case 'Disclosure of Preneed Funeral Arrangement':
            docuSignForm = new Forms.FuneralArrangementForm(caseinfoData)
            break
        default:
            break
        }

        await docuSignForm.init()
        const result = await docuSignForm.createEnvelope(docuSignClient, status, t)
        return result
    } catch (error) {
        logger.error(`Error while preparing docusign document ${error}`)
        throw error
    }
}

module.exports = {
    send
}
