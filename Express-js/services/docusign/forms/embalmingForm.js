
const BaseForm = require('./baseForm')

const ROLES = {
    FuneralAssignedTo: 'FuneralAssignedTo',
    FuneralAuthorizer: 'FuneralAuthorizer',
    EmbalmingTeam: 'EmbalmingTeam'
}

/**
    EntityLocation: DEFAULT_DOC_VALUES.EntityLocation,
    EntityFullAddress: DEFAULT_DOC_VALUES.EntityFullAddress,
    DecedentFullName: this.personFullName,
    EmbalmingAuthorizer: personContactDetails.fullName,
    EmbalmingAuthorizerRelationship: personContactDetails.relation,
    EntityLocationPhone: '',
    FuneralEstablishmentRespresentativeFullName: funeralAssignedTo.employee.Name

    EmbalmingAuthorizer: personContactDetails.fullName,
    EmbalmingAuthorizerRelationship: personContactDetails.relation
 */
class EmbalmingForm extends BaseForm {
    constructor ({ caseInfoFormId, formId }) {
        super({ caseInfoFormId })
        this.formId = formId
    }

    async envelopeData () {
        return [
            await this.funeralAssignedToPreFillData(),
            this.funeralAuthorizerPreFillData(),
            this.embalmingTeamPreFillData()
        ]
    }

    async funeralAssignedToPreFillData () {
        const funeralAssignedTo = this.getSignerByRole(
            ROLES.FuneralAssignedTo, this.formId
        )
        let anstmtData
        if (this.caseInfoForm.agreementId) {
            anstmtData = await this.getAgreementData(this.caseInfoForm.agreementId)
        }
        const personContactDetails = this.personContactDetails
        const data = {
            EntityLocation: anstmtData && anstmtData.location ? anstmtData.location.name : '',
            EntityLocation1: anstmtData && anstmtData.location ? anstmtData.location.name : '',
            EntityFullAddress: anstmtData && anstmtData.location && anstmtData.location.place && anstmtData.location.place.address ? await this.getAddress(anstmtData.location.place.address) : '',
            DecedentFullName: this.personFullName,
            EmbalmingAuthorizer: personContactDetails.fullName,
            EmbalmingAuthorizerRelationship: personContactDetails.relation,
            EntityLocationPhone: anstmtData && anstmtData.location ? anstmtData.location.phoneNumber : '',
            FuneralEstablishmentRespresentativeFullName: funeralAssignedTo.employee.Name
        }

        return this.convertToTextTabsLatest(funeralAssignedTo, data)
    }

    funeralAuthorizerPreFillData () {
        const funeralAuthorizer = this.getSignerByRole(
            ROLES.FuneralAuthorizer, this.formId
        )
        const personContactDetails = this.personContactDetails
        const data = {
            EmbalmingAuthorizer: personContactDetails.fullName,
            EmbalmingAuthorizerRelationship: personContactDetails.relation
        }

        return this.convertToTextTabsLatest(funeralAuthorizer, data)
    }
    embalmingTeamPreFillData () {
        const embalmingTeam = this.getSignerByRole(
            ROLES.EmbalmingTeam, this.formId
        )
        const data = {
        }

        return this.convertToTextTabsLatest(embalmingTeam, data)
    }
}

module.exports = EmbalmingForm
