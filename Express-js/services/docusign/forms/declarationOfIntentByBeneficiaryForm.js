const BaseForm = require('./baseForm')
const ROLES = {
    funeralDirector: 'Funeral Director',
    beneficiary: 'Beneficiary'
}
class DeclarationOfIntentByBeneficiaryForm extends BaseForm {
    constructor ({ caseInfoFormId, formId }, person) {
        super({ caseInfoFormId })
        if (person) {
            this.person = person
        }
        this.formId = formId
    }
    async envelopeData () {
        return [
            await this.funeralDirectorPrefillData(),
            await this.beneficiaryPreFillData()
        ]
    }
    async funeralDirectorPrefillReuseData (funeralDirector) {
        const beneficiaryName = this.personFullName
        const data = {
            arrangerFullName: funeralDirector && funeralDirector.employee ? funeralDirector.employee.name : '',
            beneficiaryFullName: beneficiaryName
        }
        return { data }
    }
    async funeralDirectorPrefillData () {
        const funeralDirector = this.getSignerByRole(ROLES.funeralDirector, this.formId)
        const { data } = await this.funeralDirectorPrefillReuseData(funeralDirector)
        return this.convertToTextTabsLatest(funeralDirector, data)
    }

    beneficiaryPreFillData () {
        const beneficiary = this.getSignerByRole(ROLES.beneficiary, this.formId)
        const data = {}
        return this.convertToTextTabsLatest(beneficiary, data)
    }
}
module.exports = DeclarationOfIntentByBeneficiaryForm
