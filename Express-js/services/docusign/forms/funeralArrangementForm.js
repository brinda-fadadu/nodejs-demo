const BaseForm = require('./baseForm')

const ROLES = {
    FuneralAssignedTo: 'FuneralAssignedTo',
    FuneralAuthorizer: 'FuneralAuthorizer'
}

class FuneralArrangementForm extends BaseForm {
    constructor ({ caseInfoFormId, formId }, person) {
        super({ caseInfoFormId })
        if (person) {
            this.person = person
        }
        this.formId = formId
    }

    async envelopeData () {
        return [
            await this.funeralAssignedToPreFillData(),
            this.funeralAuthorizerPreFillData()
        ]
    }
    async funeralAssignedToReuseData (funeralAssignedTo, personId) {
        let anstmtData = await this.fetchANStmtDetails(personId || this.person.id)
        anstmtData = anstmtData ? (anstmtData.Agreement ? anstmtData.Agreement : null) : null
        const data = {
            EntityLocation: anstmtData && anstmtData.location ? anstmtData.location.name : '',
            EntityLocationLicNo: anstmtData && anstmtData.location ? anstmtData.location.license : '',
            PNyes: '',
            PNno: '',
            DecedentFullName: this.personFullName,
            FuneralAssignedTo: funeralAssignedTo.employee.name,
            FuneralAssignedToRole: ''
        }
        return { data }
    }
    async funeralAssignedToPreFillData () {
        const funeralAssignedTo = this.getSignerByRole(
            ROLES.FuneralAssignedTo, this.formId
        )
        const { data } = await this.funeralAssignedToReuseData(funeralAssignedTo)

        return this.convertToTextTabsLatest(funeralAssignedTo, data)
    }

    funeralAuthorizerPreFillData () {
        const funeralAuthorizer = this.getSignerByRole(
            ROLES.FuneralAuthorizer, this.formId
        )
        const personContactDetails = this.personContactDetails

        const data = {
            FuneralAuthorizer: personContactDetails.fullName
        }

        return this.convertToTextTabsLatest(funeralAuthorizer, data)
    }
}

module.exports = FuneralArrangementForm
