const BaseForm = require('./baseForm')

const ROLES = {
    funeralDirector: 'Funeral Director',
    Purchaser: 'Purchaser',
    CoPurchaser: 'Co-Purchaser',
    Arranger2: 'Arranger2',
    Arranger3: 'Arranger3',
    Payor: 'Payor',
    CoPayor: 'Co-Payor',
    funeralHomeManager: 'Funeral Home Manager'
}

class GATrustPackage extends BaseForm {
    constructor ({ caseInfoFormId, formId }) {
        super({ caseInfoFormId })
        this.formId = formId
    }
    async envelopeData () {
        return [
            await this.FuneralDirectorPreFillData(),
            await this.purchaserPreFillData(),
            this.coPurchaserPreFillData(),
            await this.arranger2PrefillData(),
            await this.arranger3PrefillData(),
            this.payorPreFillData(),
            this.coPayorPreFillData(),
            await this.funeralHomeManagerPreFillData()

        ]
    }
    async FuneralDirectorPreFillData () {
        const PreNeedTruestAgreementForm = require('./preNeedTrustAgreementForm')
        const PNStatementOfGoodsAndServicesTrust = require('./PNStatementOfGoodsAndServicesTrust')
        const ForeignLanguageReleaseForm = require('./foreignLanguageRelease')
        const AcknowledgementAndReceipt = require('./acknowledgementAndReceipt')
        const AppointmentConfirmationToDiscussPNFuneralArrangementsAndLifeInsuranceOrAnnuityFunding = require('./appointmentConfirmationToDiscussPNFuneralArrangementsAndLifeInsuranceOrAnnuityFunding')
        const AuthorizationAgreementforPreauthorizedPaymentsFuneral = require('./authorizationAgreementforPreauthorizationPaymentsFuneral')

        const acknowledgementAndReceipt = new AcknowledgementAndReceipt({ caseInfoFormId: this.caseInfoFormId, formId: this.formId })
        const appointmentConfirmationToDiscussPNFuneralArrangement = new AppointmentConfirmationToDiscussPNFuneralArrangementsAndLifeInsuranceOrAnnuityFunding({ caseInfoFormId: this.caseInfoFormId, formId: this.formId })
        const authorizationAgreementforPreauthorizedPaymentsFuneral = new AuthorizationAgreementforPreauthorizedPaymentsFuneral({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.caseInfoForm)
        const preNeedTruestAgreementForm = new PreNeedTruestAgreementForm({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.person)
        const pnStatementOfGoodsAndServicesTrust = new PNStatementOfGoodsAndServicesTrust({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.caseInfoForm, this.person)
        const foreignLanguageReleaseForm = new ForeignLanguageReleaseForm({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.person)

        const funeralDirector = this.getSignerByRole(ROLES.funeralDirector, this.formId)
        const purchaser = this.getSignerByRole(ROLES.Purchaser, this.formId)

        const { data: preNeedFormData, checkBoxData } = await preNeedTruestAgreementForm.funeralDirectorPreFillReuseData(purchaser, this.caseInfoForm.agreementId)
        const { data: pnStatementData, checkboxData } = await pnStatementOfGoodsAndServicesTrust.funeralAssignedToPreFillReuseData(funeralDirector)
        const { textdata: foreignLanguageReleaseData } = await foreignLanguageReleaseForm.funeralAssignedToPreFillDataForReUse(this.caseInfoForm.agreementId, this.caseInfoForm.personId)
        const arranger2 = this.getSignerByRole(ROLES.Arranger2, this.formId)
        const arranger3 = this.getSignerByRole(ROLES.Arranger3, this.formId)
        const { checkBoxData: checkDataBox } = await acknowledgementAndReceipt.arrangerPreFillReuseData()
        const { data: appointmentConfirmationData } = await appointmentConfirmationToDiscussPNFuneralArrangement.arranger1PreFillReuseData(funeralDirector, arranger2, arranger3, purchaser)
        const { textData: paymentsData } = await authorizationAgreementforPreauthorizedPaymentsFuneral.arrangerPrefillReuseData(this.caseInfoForm.agreementId)
        const { data: acknowledgementFormData } = await acknowledgementAndReceipt.purchaserPreFillReuseData(purchaser, this.caseInfoForm.personId)
        const acknowledgementFormattedData = {
            purchaserName1: acknowledgementFormData.purchaserName,
            funeralLocationName: acknowledgementFormData.funeralLocationName
        }
        appointmentConfirmationData.purchaserName2 = appointmentConfirmationData.purchaserName
        appointmentConfirmationData.purchaserAddress2 = appointmentConfirmationData.purchaserAddress
        delete appointmentConfirmationData.purchaserName
        delete appointmentConfirmationData.purchaserAddress

        pnStatementData.FuneralCaseId1 = pnStatementData.FuneralCaseId
        pnStatementData.FuneralAssignedTo1 = pnStatementData.FuneralAssignedTo
        pnStatementData.FuneralAssignedTo2 = pnStatementData.FuneralAssignedTo
        pnStatementData.BeneficiaryDOB2 = pnStatementData.BeneficiaryDOB
        pnStatementData.PurchaserAddress3 = pnStatementData.PurchaserAddress
        pnStatementData.PurchaserCity3 = pnStatementData.PurchaserCity
        pnStatementData.PurchaserState3 = pnStatementData.PurchaserState
        delete pnStatementData.FuneralCaseId
        delete pnStatementData.FuneralAssignedTo
        delete pnStatementData.BeneficiaryDOB
        delete pnStatementData.PurchaserAddress
        delete pnStatementData.PurchaserCity
        delete pnStatementData.PurchaserState
        const foreignLanguageFormData = {
            EntityLocation1: foreignLanguageReleaseData.EntityLocation,
            FuneralCaseID2: foreignLanguageReleaseData.FuneralCaseID
        }
        const textData = {
            ...preNeedFormData,
            ...pnStatementData,
            ...foreignLanguageFormData,
            ...appointmentConfirmationData,
            ...paymentsData,
            ...acknowledgementFormattedData
        }
        const checkData = {
            ...checkBoxData,
            ...checkboxData,
            ...checkDataBox
        }
        return this.convertToTextTabsLatest(funeralDirector, textData, checkData)
    }
    async purchaserPreFillData () {
        const PreNeedTruestAgreementForm = require('./preNeedTrustAgreementForm')
        const ForeignLanguageReleaseForm = require('./foreignLanguageRelease')

        const preNeedTruestAgreementForm = new PreNeedTruestAgreementForm({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.person)
        const foreignLanguageReleaseForm = new ForeignLanguageReleaseForm({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.person)
        const purchaser = this.getSignerByRole(ROLES.Purchaser, this.formId)
        const { data: preNeedPurchaserData } = await preNeedTruestAgreementForm.purchaserPreFillReuseData(purchaser)
        const { textdata } = foreignLanguageReleaseForm.purchaserPreFillDataforReUse(purchaser)
        const data = {
            PurchaserFullName1: textdata.PurchaserFullName,
            ...preNeedPurchaserData
        }
        return this.convertToTextTabsLatest(purchaser, data)
    }
    async funeralHomeManagerPreFillData () {
        const PreNeedTruestAgreementForm = require('./preNeedTrustAgreementForm')
        const preNeedTruestAgreementForm = new PreNeedTruestAgreementForm({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.person)
        const funeralHomeManager = this.getSignerByRole(ROLES.funeralHomeManager, this.formId)
        const { data: preNeedfuneralHomemanagerData } = await preNeedTruestAgreementForm.funeralHomeManagerPreFillReuseData()
        return this.convertToTextTabsLatest(funeralHomeManager, preNeedfuneralHomemanagerData)
    }
    coPurchaserPreFillData () {
        const ForeignLanguageReleaseForm = require('./foreignLanguageRelease')
        const foreignLanguageReleaseForm = new ForeignLanguageReleaseForm({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.person)
        const coPurchaser = this.getSignerByRole(ROLES.CoPurchaser, this.formId)
        const { data } = foreignLanguageReleaseForm.coPurchaserPreFillDataforReUse(coPurchaser)
        return this.convertToTextTabsLatest(coPurchaser, data)
    }
    async arranger2PrefillData () {
        const arranger2 = this.getSignerByRole(ROLES.Arranger2, this.formId)
        let data = {
        }
        return this.convertToTextTabsLatest(arranger2, data)
    }
    async arranger3PrefillData () {
        const arranger3 = this.getSignerByRole(ROLES.Arranger3, this.formId)
        let data = {
        }
        return this.convertToTextTabsLatest(arranger3, data)
    }
    payorPreFillData () {
        const AuthorizationAgreementforPreauthorizedPaymentsFuneral = require('./authorizationAgreementforPreauthorizationPaymentsFuneral')
        const authorizationAgreementforPreauthorizedPaymentsFuneral = new AuthorizationAgreementforPreauthorizedPaymentsFuneral({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.caseInfoForm)
        const payor = this.getSignerByRole(ROLES.Payor, this.formId)
        const coPayor = this.getSignerByRole(ROLES.CoPayor, this.formId)
        const { textData } = authorizationAgreementforPreauthorizedPaymentsFuneral.payorPreFillReuseData(payor, coPayor)
        return this.convertToTextTabsLatest(payor, textData)
    }
    coPayorPreFillData () {
        const coPayor = this.getSignerByRole(ROLES.CoPayor, this.formId)
        return this.convertToTextTabsLatest(coPayor, {})
    }
}
module.exports = GATrustPackage
