const BaseForm = require('./baseForm')

const ROLES = {
    funeralAssignedTo: 'FuneralAssignedTo',
    purchaser: 'Purchaser',
    coPurchaser: 'Co-Purchaser',
    funeralAuthorizer: 'FuneralAuthorizer',
    nextOfKin1: 'Next Of Kin 1',
    nextOfKin2: 'Next Of Kin 2',
    nextOfKin3: 'Next Of Kin 3',
    nextOfKin4: 'Next Of Kin 4',
    nextOfKin5: 'Next Of Kin 5',
    nextOfKin6: 'Next Of Kin 6',
    nextOfKin7: 'Next Of Kin 7',
    nextOfKin8: 'Next Of Kin 8'
}

class ANCremationPackage extends BaseForm {
    constructor (caseInfoData) {
        let caseInfoFormId = caseInfoData.caseInfoFormId
        super({ caseInfoFormId })
        this.personId = caseInfoData.personId
        this.formId = caseInfoData.formId
    }

    async envelopeData () {
        return [
            await this.funeralAssignedToPreFillData(),
            this.purchaserPreFillData(),
            this.coPurchaserPreFillData(),
            await this.funeralAuthorizerFillData(),
            await this.nextOfKinPreFillData('nextOfKin1', 'nok1'),
            await this.nextOfKinPreFillData('nextOfKin2', 'nok2'),
            await this.nextOfKinPreFillData('nextOfKin3', 'nok3'),
            await this.nextOfKinPreFillData('nextOfKin4', 'nok4'),
            await this.nextOfKinPreFillData('nextOfKin5', 'nok5'),
            await this.nextOfKinPreFillData('nextOfKin6', 'nok6'),
            await this.nextOfKinPreFillData('nextOfKin7', 'nok7'),
            await this.nextOfKinPreFillData('nextOfKin8', 'nok8')
        ]
    }

    async funeralAssignedToPreFillData () {
        // 1. AN Statement of Goods and Services
        // 2. Disclosure of Preneed Funeral Arrangement
        // 3. Affidavit of Disposition of Control Over Remains
        // 4. Foreign Language Release
        // 5. Cremation and Disposition Authorization - Make a reusable fn for noks
        // 6. Declaration for Disposition of Cremated Remains

        const funeralAssignedTo = this.getSignerByRole(ROLES.funeralAssignedTo, this.formId)

        // Importing Forms
        const ANStatementOfGoodsAndServicesForm = require('./anFuneralStatementForm')
        const FuneralArrangementForm = require('./funeralArrangementForm')
        const AffidavitOfDispositionOfControlOverRemainsForm = require('./dispositionForm')
        const ForeignLanguageReleaseForm = require('./foreignLanguageRelease')
        const CremationAndDispositionAuthorizationForm = require('./cremationAndDispositionAuthorizationForm')
        const DeclarationForDispositionOfCrematedRemainsForm = require('./declarationForDispositionOfCrematedRemains')

        // Creating an instance of the form
        const ANStatementOfGoodsAndServicesFormController = new ANStatementOfGoodsAndServicesForm({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.person)
        const FuneralArrangementFormController = new FuneralArrangementForm({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.person)
        const AffidavitOfDispositionOfControlOverRemainsFormController = new AffidavitOfDispositionOfControlOverRemainsForm({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.recipients, this.person)
        const ForeignLanguageReleaseFormController = new ForeignLanguageReleaseForm({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.person)
        const CremationAndDispositionAuthorizationFormController = new CremationAndDispositionAuthorizationForm({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.recipients, this.person)
        const DeclarationForDispositionOfCrematedRemainsFormController = new DeclarationForDispositionOfCrematedRemainsForm({ caseInfoFormId: this.caseInfoFormId, personId: this.personId, formId: this.formId })

        // Calling the data fetching methods of the forms needed for the package
        const { data, checkboxData } = await ANStatementOfGoodsAndServicesFormController.funeralAssignedToReuseData(funeralAssignedTo, this.caseInfoForm.agreementId, this.caseInfoForm.personId, this.caseInfoForm.metaData)
        const { data: funeralArrangementFormData } = await FuneralArrangementFormController.funeralAssignedToReuseData(funeralAssignedTo, this.caseInfoForm.personId)
        const { textdata: dispositionFormData } = await AffidavitOfDispositionOfControlOverRemainsFormController.funeralAssignedToPreFillDataForReUse(funeralAssignedTo, this.caseInfoForm.agreementId)
        const { textdata: foreignLanguageReleaseData } = await ForeignLanguageReleaseFormController.funeralAssignedToPreFillDataForReUse(this.caseInfoForm.agreementId, this.caseInfoForm.personId)
        const { cremationAndDispositiontextData, cremationAndDispositionCheckBoxData, intialCheckbox, cremationAndDispositionGroupLabelData } = await CremationAndDispositionAuthorizationFormController.funeralAssignedToReuseData(this.caseInfoForm.metaData)
        this.addtionalData = { 'Cremation and Disposition Authorization': intialCheckbox }

        const nextOfKin1 = this.getSignerByRole(ROLES.nextOfKin1, this.formId)
        const nextOfKin2 = this.getSignerByRole(ROLES.nextOfKin2, this.formId)
        const nextOfKin3 = this.getSignerByRole(ROLES.nextOfKin3, this.formId)
        const funeralAuthorizer = this.getSignerByRole(ROLES.funeralAuthorizer, this.formId)
        const purchaser = this.getSignerByRole(ROLES.purchaser, this.formId)
        const DeclarationForDispositionOfCrematedRemainsFormData = await DeclarationForDispositionOfCrematedRemainsFormController.funeralAssignedToReuseData(this.caseInfoForm.agreementId, nextOfKin1, nextOfKin2, nextOfKin3, funeralAuthorizer, purchaser)

        const ANStatementOfGoodsAndServicesFormtextData = {
            ...data,
            FuneralAssignedTo2: data.FuneralAssignedTo
        }

        const FuneralArrangementFormtextData = {
            ...funeralArrangementFormData,
            FuneralAssignedTo3: funeralArrangementFormData.FuneralAssignedTo
        }

        delete FuneralArrangementFormtextData.FuneralAssignedTo

        const AffidavitOfDispositionOfControlOverRemainsFormtextData = {
            EntityLocation2: dispositionFormData.EntityLocation,
            FuneralAssignedTo4: dispositionFormData.FuneralAssignedTo
        }

        const ForeignLanguageReleaseFormtextData = {
            EntityLocation3: foreignLanguageReleaseData.EntityLocation,
            FuneralCaseID2: foreignLanguageReleaseData.FuneralCaseID
        }

        const ForeignLanguageReleaseFormCheckBoxData = {}

        const DeclarationForDispositionOfCrematedRemainsFormtextData = {
            ...DeclarationForDispositionOfCrematedRemainsFormData,
            DecedentFullName3: DeclarationForDispositionOfCrematedRemainsFormData.DecedentFullName
        }

        delete DeclarationForDispositionOfCrematedRemainsFormtextData.DecedentFullName

        const commonTextData = { ...ANStatementOfGoodsAndServicesFormtextData, ...FuneralArrangementFormtextData, ...AffidavitOfDispositionOfControlOverRemainsFormtextData, ...ForeignLanguageReleaseFormtextData, ...DeclarationForDispositionOfCrematedRemainsFormtextData, ...cremationAndDispositiontextData }
        const commonCheckboxData = { ...checkboxData, ...ForeignLanguageReleaseFormCheckBoxData, ...cremationAndDispositionCheckBoxData }
        const commonGroupLabelData = { ...cremationAndDispositionGroupLabelData }
        return this.convertToTextTabsLatest(funeralAssignedTo, commonTextData, commonCheckboxData, commonGroupLabelData)
    }

    purchaserPreFillData () {
        const ForeignLanguageReleaseForm = require('./foreignLanguageRelease')
        const foreignLanguageReleaseForm = new ForeignLanguageReleaseForm({ caseInfoFormId: this.caseInfoFormId }, this.person)
        const purchaser = this.getSignerByRole(ROLES.purchaser, this.formId)
        const { textdata } = foreignLanguageReleaseForm.purchaserPreFillDataforReUse(purchaser)
        return this.convertToTextTabsLatest(purchaser, textdata)
    }

    coPurchaserPreFillData () {
        const ForeignLanguageReleaseForm = require('./foreignLanguageRelease')
        const foreignLanguageReleaseForm = new ForeignLanguageReleaseForm({ caseInfoFormId: this.caseInfoFormId }, this.person)
        const coPurchaser = this.getSignerByRole(ROLES.coPurchaser, this.formId)
        const { data } = foreignLanguageReleaseForm.coPurchaserPreFillDataforReUse(coPurchaser)
        return this.convertToTextTabsLatest(coPurchaser, data)
    }

    async funeralAuthorizerFillData () {
        const AffidavitOfDispositionOfControlOverRemainsForm = require('./dispositionForm')
        const AffidavitOfDispositionOfControlOverRemainsFormController = new AffidavitOfDispositionOfControlOverRemainsForm({ caseInfoFormId: this.caseInfoFormId }, this.recipients, this.person)
        const { textdata: dispositionData } = await AffidavitOfDispositionOfControlOverRemainsFormController.funeralAuthorizerPreFillDataForReUse()
        const funeralAuthorizer = this.getSignerByRole(ROLES.funeralAuthorizer, this.formId)
        const personContactDetails = this.personContactDetails
        const textData = {
            FuneralAuthorizer: personContactDetails.fullName,
            DecedentFullName2: dispositionData.DecedentFullName,
            ...dispositionData
        }
        delete textData.DecedentFullName
        return this.convertToTextTabsLatest(funeralAuthorizer, textData)
    }

    async nextOfKinPreFillData (role, nok) {
        const nextOfKin = this.getSignerByRole(ROLES[role], this.formId)
        const CremationAndDispositionAuthorizationForm = require('./cremationAndDispositionAuthorizationForm')
        const CremationAndDispositionAuthorizationFormController = new CremationAndDispositionAuthorizationForm({ caseInfoFormId: this.caseInfoFormId })
        const cremationAndDispositiontextData = await CremationAndDispositionAuthorizationFormController.nextOfKinReusePreFillData(nextOfKin, nok)
        const textData = {
            ...cremationAndDispositiontextData
        }
        return this.convertToTextTabsLatest(nextOfKin, textData)
    }
}
module.exports = ANCremationPackage
