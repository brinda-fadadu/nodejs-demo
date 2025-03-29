const BaseForm = require('./baseForm')

const ROLES = {
    arranger: 'Arranger',
    purchaser: 'Purchaser',
    coPurchaser: 'Co-Purchaser',
    beneficiary: 'Beneficiary',
    payor: 'Payor',
    arranger2: 'Arranger2',
    arranger3: 'Arranger3',
    spouseOfPurchaser: 'Spouse Of Purchaser',
    legalRepresentativeOfPurchaser: 'Legal Representative Of Purchaser',
    vpOfSales: 'Vp Of Sales'
}

class GAInsurancePackage extends BaseForm {
    constructor ({ caseInfoFormId, formId }) {
        super({ caseInfoFormId })
        this.formId = formId
    }
    async envelopeData () {
        return [
            await this.arrangerPrefillData(),
            await this.purchaserPreFillData(),
            this.coPurchaserPreFillData(),
            this.beneficiaryPreFillData(),
            this.payorPreFillData(),
            this.arranger2PrefillData(),
            this.arranger3PrefillData(),
            this.spouseOfPurchaserPreFillData(),
            this.legalRepresentativePreFillData(),
            this.vpOfSalesPreFillData()
        ]
    }
    async arrangerPrefillData () {
        const GlobalAtlanticGroupElectronicDocumentDisclosureAndConsent = require('./GlobalAtlanticGroupElectronicDocumentDisclosureAndConsent')
        // const GlobalAtlanticGroupPreneedNewBusinessOptions = require('./globalAtlanticGroupPreneedNewBusinessOptions')
        const PNStatementOfGoodsAndServicesInsurance = require('./pnStatementOfGoodsAndServicesInsurance')
        const AcknowledgementAndReceipt = require('./acknowledgementAndReceipt')
        const ForeignLanguageReleaseForm = require('./foreignLanguageRelease')
        const AppointmentConfirmationToDiscussPNFuneralArrangementsAndLifeInsuranceOrAnnuityFunding = require('./appointmentConfirmationToDiscussPNFuneralArrangementsAndLifeInsuranceOrAnnuityFunding')

        const globalAtlanticGroupElectronicDocumentDisclosureAndConsent = new GlobalAtlanticGroupElectronicDocumentDisclosureAndConsent({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.person)
        // const globalAtlanticGroupPreneedNewBusinessOptions = new GlobalAtlanticGroupPreneedNewBusinessOptions({ caseInfoFormId: this.caseInfoFormId }, this.person)
        const pnStatementOfGoodsAndServicesInsurance = new PNStatementOfGoodsAndServicesInsurance({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.caseInfoForm, this.person)
        const acknowledgementAndReceipt = new AcknowledgementAndReceipt({ caseInfoFormId: this.caseInfoFormId, formId: this.formId })
        const foreignLanguageReleaseForm = new ForeignLanguageReleaseForm({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.person)
        const appointmentConfirmationToDiscussPNFuneralArrangement = new AppointmentConfirmationToDiscussPNFuneralArrangementsAndLifeInsuranceOrAnnuityFunding({ caseInfoFormId: this.caseInfoFormId })

        const arranger = this.getSignerByRole(ROLES.arranger, this.formId)
        const arranger2 = this.getSignerByRole(ROLES.arranger2, this.formId)
        const arranger3 = this.getSignerByRole(ROLES.arranger3, this.formId)
        const purchaser = this.getSignerByRole(ROLES.purchaser, this.formId)
        const { textData: globalAtlanticGroupElectronicData, checkBoxData: globalAtlanticGroupElectronicCheckBoxData } = await globalAtlanticGroupElectronicDocumentDisclosureAndConsent.funeralArrangerPreFillDataForReUse(arranger, purchaser, this.caseInfoForm.metaData, this.caseInfoForm.agreementId)
        // const { textData: globalAtlanticGroupPreneedData } = await globalAtlanticGroupPreneedNewBusinessOptions.funeralArrangerPreFillDataForReUse(purchaser, this.caseInfoForm.agreementId)
        const { data: pnStatementData, pnStatementCheckboxData } = await pnStatementOfGoodsAndServicesInsurance.funeralAssignedToPreFillReuseData(arranger)
        const { checkBoxData: acknowledgementCheckBoxData } = await acknowledgementAndReceipt.arrangerPreFillReuseData()
        const { textdata: foreignLanguageReleaseData } = await foreignLanguageReleaseForm.funeralAssignedToPreFillDataForReUse(this.caseInfoForm.agreementId, this.caseInfoForm.personId)
        const { data: appointmentConfirmationData } = await appointmentConfirmationToDiscussPNFuneralArrangement.arranger1PreFillReuseData(arranger, arranger2, arranger3, purchaser)

        const commonData = {
            ...globalAtlanticGroupElectronicData,
            // ...globalAtlanticGroupPreneedData,
            ...pnStatementData,
            ...foreignLanguageReleaseData,
            ...appointmentConfirmationData,
            benificiaryName3: globalAtlanticGroupElectronicData.benificiaryName,
            purchaserName3: globalAtlanticGroupElectronicData.purchaserName,
            purchaserName4: appointmentConfirmationData.purchaserName,
            purchaserAddress4: appointmentConfirmationData.purchaserAddress
        }
        const commonCheckData = {
            ...globalAtlanticGroupElectronicCheckBoxData,
            ...pnStatementCheckboxData,
            ...acknowledgementCheckBoxData
        }
        return this.convertToTextTabsLatest(arranger, commonData, commonCheckData)
    }
    async purchaserPreFillData () {
        const GlobalAtlanticGroupElectronicDocumentDisclosureAndConsent = require('./GlobalAtlanticGroupElectronicDocumentDisclosureAndConsent')
        const AcknowledgementAndReceipt = require('./acknowledgementAndReceipt')
        const ForeignLanguageReleaseForm = require('./foreignLanguageRelease')

        const globalAtlanticGroupElectronicDocumentDisclosureAndConsent = new GlobalAtlanticGroupElectronicDocumentDisclosureAndConsent({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.person)
        const acknowledgementAndReceipt = new AcknowledgementAndReceipt({ caseInfoFormId: this.caseInfoFormId, formId: this.formId })
        const foreignLanguageReleaseForm = new ForeignLanguageReleaseForm({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.person)

        const purchaser = this.getSignerByRole(ROLES.purchaser, this.formId)
        const { textData: globalAtlanticGroupElectronicData, checkboxData: globalAtlanticGroupElectronicCheckBoxData, groupLabelData: globalAtlanticGroupElectronicGroupLabelData } = globalAtlanticGroupElectronicDocumentDisclosureAndConsent.purchaserPreFillDataForReUse()
        const { data: acknowledgementFormData } = await acknowledgementAndReceipt.purchaserPreFillReuseData(purchaser, this.caseInfoForm.personId)
        const { textdata: foreignData } = foreignLanguageReleaseForm.purchaserPreFillDataforReUse(purchaser)
        const commonData = {
            ...globalAtlanticGroupElectronicData,
            ...acknowledgementFormData,
            ...foreignData
        }
        const commonCheckData = {
            ...globalAtlanticGroupElectronicCheckBoxData
        }
        const commonGroupLabelData = {
            ...globalAtlanticGroupElectronicGroupLabelData
        }
        return this.convertToTextTabsLatest(purchaser, commonData, commonCheckData, commonGroupLabelData)
    }
    coPurchaserPreFillData () {
        const ForeignLanguageReleaseForm = require('./foreignLanguageRelease')
        const foreignLanguageReleaseForm = new ForeignLanguageReleaseForm({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.person)
        const coPurchaser = this.getSignerByRole(ROLES.coPurchaser, this.formId)
        const { data } = foreignLanguageReleaseForm.coPurchaserPreFillDataforReUse(coPurchaser)
        return this.convertToTextTabsLatest(coPurchaser, data)
    }
    beneficiaryPreFillData () {
        const GlobalAtlanticGroupElectronicDocumentDisclosureAndConsent = require('./GlobalAtlanticGroupElectronicDocumentDisclosureAndConsent')
        const globalAtlanticGroupElectronicDocumentDisclosureAndConsent = new GlobalAtlanticGroupElectronicDocumentDisclosureAndConsent({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.person)
        const { textData: globalAtlanticGroupElectronicData, checkboxData: globalAtlanticGroupElectronicCheckBoxData, groupLabelData: globalAtlanticGroupElectronicGroupLabelData } = globalAtlanticGroupElectronicDocumentDisclosureAndConsent.beneficiaryPreFillDataForReUse()
        const beneficiary = this.getSignerByRole(ROLES.beneficiary, this.formId)
        const commonData = {
            ...globalAtlanticGroupElectronicData
        }
        const commonCheckData = {
            ...globalAtlanticGroupElectronicCheckBoxData
        }
        const commonGroupLabelData = {
            ...globalAtlanticGroupElectronicGroupLabelData
        }
        return this.convertToTextTabsLatest(beneficiary, commonData, commonCheckData, commonGroupLabelData)
    }
    arranger2PrefillData () {
        const arranger2 = this.getSignerByRole(ROLES.arranger2, this.formId)
        let data = {
        }
        return this.convertToTextTabsLatest(arranger2, data)
    }
    arranger3PrefillData () {
        const arranger3 = this.getSignerByRole(ROLES.arranger3, this.formId)
        let data = {
        }
        return this.convertToTextTabsLatest(arranger3, data)
    }
    payorPreFillData () {
        const GlobalAtlanticGroupElectronicDocumentDisclosureAndConsent = require('./GlobalAtlanticGroupElectronicDocumentDisclosureAndConsent')
        const globalAtlanticGroupElectronicDocumentDisclosureAndConsent = new GlobalAtlanticGroupElectronicDocumentDisclosureAndConsent({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.person)
        const payor = this.getSignerByRole(ROLES.payor, this.formId)
        const { textData: globalAtlanticGroupElectronicData, checkboxData: globalAtlanticGroupElectronicCheckBoxData, groupLabelData: globalAtlanticGroupElectronicGroupLabelData } = globalAtlanticGroupElectronicDocumentDisclosureAndConsent.payorPreFillDataForReUse()
        const commonData = {
            ...globalAtlanticGroupElectronicData
        }
        const commonCheckData = {
            ...globalAtlanticGroupElectronicCheckBoxData
        }
        const commonGroupLabelData = {
            ...globalAtlanticGroupElectronicGroupLabelData
        }
        return this.convertToTextTabsLatest(payor, commonData, commonCheckData, commonGroupLabelData)
    }
    spouseOfPurchaserPreFillData () {
        const spouseOfPurchaser = this.getSignerByRole(ROLES.spouseOfPurchaser, this.formId)
        const data = {}
        let checkboxData = {}
        const groupLabelData = {}
        return this.convertToTextTabsLatest(spouseOfPurchaser, data, checkboxData, groupLabelData)
    }
    legalRepresentativePreFillData () {
        const GlobalAtlanticGroupElectronicDocumentDisclosureAndConsent = require('./GlobalAtlanticGroupElectronicDocumentDisclosureAndConsent')
        const globalAtlanticGroupElectronicDocumentDisclosureAndConsent = new GlobalAtlanticGroupElectronicDocumentDisclosureAndConsent({ caseInfoFormId: this.caseInfoFormId, formId: this.formId }, this.person)
        const { textData: globalAtlanticGroupElectronicData, checkboxData: globalAtlanticGroupElectronicCheckBoxData, groupLabelData: globalAtlanticGroupElectronicGroupLabelData } = globalAtlanticGroupElectronicDocumentDisclosureAndConsent.legalRepresentativePreFillDataForReUse()
        const legalRep = this.getSignerByRole(ROLES.legalRepresentativeOfPurchaser, this.formId)
        const commonData = {
            ...globalAtlanticGroupElectronicData
        }
        const commonCheckData = {
            ...globalAtlanticGroupElectronicCheckBoxData
        }
        const commonGroupLabelData = {
            ...globalAtlanticGroupElectronicGroupLabelData
        }
        return this.convertToTextTabsLatest(legalRep, commonData, commonCheckData, commonGroupLabelData)
    }
    vpOfSalesPreFillData () {
        const vpOfSales = this.getSignerByRole(ROLES.vpOfSales, this.formId)
        const data = {}
        return this.convertToTextTabsLatest(vpOfSales, data)
    }
}
module.exports = GAInsurancePackage
