const moment = require('moment')
const BaseForm = require('./baseForm')
const _ = require('underscore')
const cemeteryFormHelper = require('./cemeteryFormHelper')
const { formatPhoneNumber } = require('../../../utils/formatters')
const models = require('../../../models')
const { getAnticipatedPayments } = require('./funeralFormsHelper')
const { sequelize } = require('../../../models')

const ROLES = {
    'salesCounselor': 'Sales Counselor',
    'purchaser': 'Purchaser',
    'salesManager': 'Sales Manager'
}

class QuotationForm extends BaseForm {
    constructor ({ caseInfoFormId, formId }) {
        super({ caseInfoFormId })
        this.formId = formId
    }
    async envelopeData () {
        return [
            await this.salesCounselorToPreFillData(),
            this.purchaserPreFillData(),
            this.salesManagerPreFillData()
        ]
    }
    async getValue (services, merchandise) {
        const servicesValue = services ? Number(services.totalValue) : 0.0
        const merchandiseValue = merchandise ? Number(merchandise.totalValue) : 0.0
        return servicesValue + merchandiseValue
    }
    async salesCounselorToPreFillData () {
        // let metaData = this.caseInfoForm.metaData ? JSON.parse(this.caseInfoForm.metaData.replace(/'/g, '"')) : ''
        let metaData = this.caseInfoForm.metaData ? JSON.parse(this.caseInfoForm.metaData) : ''
        let quotationResult = await models.Quotation.findOne({
            where: {
                id: this.caseInfoForm.quotationId,
                deletedBy: null,
                deletedAt: null
            }
        })
        let contractNumber = quotationResult.quotationNumber
        let timezone = metaData.timezone ? metaData.timezone : null
        const salesCounselor = this.getSignerByRole(ROLES.salesCounselor, this.formId)
        let cemeteryContractResult = {}
        // Calling cemetery agreement function to get agreement related data
        cemeteryContractResult = await cemeteryFormHelper.getCemeteryAgreementDetails(quotationResult.cemeteryAgreementId, this.caseInfoFormId)
        if (!_.isEmpty(cemeteryContractResult)) {
            // eslint-disable-next-line no-unused-vars
            let purchaserData = this.getSignerByRole(ROLES.purchaser, this.formId)
            purchaserData = purchaserData.agreementPerson ? purchaserData.agreementPerson.person : null
            let appendix = []
            let cremServItem = cemeteryContractResult.cremationService.item.join(',')
            let cremServDesc = cemeteryContractResult.cremationService.description.join(',')
            let cemServItem = cemeteryContractResult.cemeteryService.item.join(',')
            let cemServDesc = cemeteryContractResult.cemeteryService.description.join(',')
            let vaultItem = cemeteryContractResult.vault.item.join(', ')
            let vaultDesc = cemeteryContractResult.vault.description.join(', ')
            let cryptItem = cemeteryContractResult.cryptPlate.item.join(', ')
            let cryptDesc = cemeteryContractResult.cryptPlate.description.join(', ')
            let nicheItem = cemeteryContractResult.nichePlate.item.join(', ')
            let nicheDesc = cemeteryContractResult.nichePlate.description.join(', ')
            let monumentItem = cemeteryContractResult.monument.item.join(', ')
            let monumentDesc = cemeteryContractResult.monument.description.join(', ')
            let lmItem = cemeteryContractResult.lawnMarker.item.join(', ')
            let lmDesc = cemeteryContractResult.lawnMarker.description.join(', ')
            let baseItem = cemeteryContractResult.base.item.join(', ')
            let baseDesc = cemeteryContractResult.base.description.join(', ')
            let foundationItem = cemeteryContractResult.foundation.item.join(', ')
            let foundationDesc = cemeteryContractResult.foundation.description.join(', ')
            let vaseItem = cemeteryContractResult.vases.item.join(', ')
            let vaseDesc = cemeteryContractResult.vases.description.join(', ')
            let photoItem = cemeteryContractResult.photo.item.join(', ')
            let photoDesc = cemeteryContractResult.photo.description.join(', ')
            let urnItem = cemeteryContractResult.urn.item.join(', ')
            let urnDesc = cemeteryContractResult.urn.description.join(', ')
            let ksItem = cemeteryContractResult.keepsake.item.join(', ')
            let ksDesc = cemeteryContractResult.keepsake.description.join(', ')
            let casketItem = cemeteryContractResult.casket.item.join(', ')
            let casketDesc = cemeteryContractResult.casket.description.join(', ')
            let inscItem = cemeteryContractResult.inscription.item.join(', ')
            let inscDesc = cemeteryContractResult.inscription.description.join(', ')
            let otherItem = cemeteryContractResult.others.item.join(', ')
            let otherDesc = cemeteryContractResult.others.description.join(', ')
            let bqServItem = cemeteryContractResult.bequestService.item.join(', ')
            let repaymentAmount = cemeteryContractResult.repaymentAmount
            let beneficiaries = cemeteryContractResult.beneficiary.join(', ')
            let propLoc = cemeteryContractResult.propertyLocation

            let textdata = {
                AppendixAContractNumber: contractNumber,
                AppendixApurchaser: purchaserData ? `${purchaserData.firstName} ${purchaserData.middleName || ''} ${purchaserData.lastName || ''}` : '',
                AppendixBContractNumber: contractNumber,
                AppendixBpurchaser: purchaserData ? `${purchaserData.firstName} ${purchaserData.middleName || ''} ${purchaserData.lastName || ''}` : '',
                ContractNumber: contractNumber,
                ContractPrintDate: moment().format('MM/DD/YYYY'),
                PropertyBurialRights: cemeteryContractResult.propertyRightsInfo && cemeteryContractResult.propertyRightsInfo.defaultRights ? cemeteryContractResult.propertyRightsInfo.defaultRights : '',
                'topmostSubform[0].Page1[0].LocationName[0]': propLoc,
                'topmostSubform[0].Page1[0].SpacePrice[0]': this.getPriceWithDecimial(cemeteryContractResult.propertyPrice || 0),
                'topmostSubform[0].Page1[0].RightsForName[0]': beneficiaries,

                'topmostSubform[0].Page1[0].CremationSvcQty[0]': cemeteryContractResult.cremationService.quantity,
                'topmostSubform[0].Page1[0].CremationServiceItemNum[0]': cremServItem,
                'topmostSubform[0].Page1[0].CremationSvcDescr[0]': cremServDesc,
                'topmostSubform[0].Page1[0].CremationSvcPrice[0]': this.getPriceWithDecimial(cemeteryContractResult.cremationService.price),

                'topmostSubform[0].Page1[0].CemeteryServiceOCQty[0]': cemeteryContractResult.cemeteryService.quantity,
                'topmostSubform[0].Page1[0].CemeteryServiceOCItemNum[0]': cemServItem,
                'topmostSubform[0].Page1[0].CemeteryServiceOCDescr[0]': cemServDesc,
                'topmostSubform[0].Page1[0].CemeteryServiceOCPrice[0]': this.getPriceWithDecimial(cemeteryContractResult.cemeteryService.price),

                'topmostSubform[0].Page1[0].VaultLinerContainerQty[0]': cemeteryContractResult.vault.quantity,
                'topmostSubform[0].Page1[0].VaultLinerContainerItemNum[0]': vaultItem,
                'topmostSubform[0].Page1[0].VaultLinerContainerDescr[0]': vaultDesc,
                'topmostSubform[0].Page1[0].VaultLinerContainerPrice[0]': this.getPriceWithDecimial(cemeteryContractResult.vault.price),

                'topmostSubform[0].Page1[0].CryptPlateQty[0]': cemeteryContractResult.cryptPlate.quantity,
                'topmostSubform[0].Page1[0].CryptPlateItemNum[0]': cryptItem,
                'topmostSubform[0].Page1[0].CryptPlateDescr[0]': cryptDesc,
                'topmostSubform[0].Page1[0].CryptPlatePrice[0]': this.getPriceWithDecimial(cemeteryContractResult.cryptPlate.price),

                'topmostSubform[0].Page1[0].NichePlateQty[0]': cemeteryContractResult.nichePlate.quantity,
                'topmostSubform[0].Page1[0].NichePlateItemNum[0]': nicheItem,
                'topmostSubform[0].Page1[0].NichePlateDescr[0]': nicheDesc,
                'topmostSubform[0].Page1[0].NichePlatePrice[0]': this.getPriceWithDecimial(cemeteryContractResult.nichePlate.price),

                'topmostSubform[0].Page1[0].BronzeMemorialsQty[0]': '', // prefill No for bronze memorials
                'topmostSubform[0].Page1[0].BronzeMemorialsItemNum[0]': '',
                'topmostSubform[0].Page1[0].BronzeMemorialsDescr[0]': '',
                'topmostSubform[0].Page1[0].BronzeMemorialsPrice[0]': '',

                'topmostSubform[0].Page1[0].MonumentQty[0]': cemeteryContractResult.monument.quantity,
                'topmostSubform[0].Page1[0].MonumentItemNum[0]': monumentItem,
                'topmostSubform[0].Page1[0].MonumentDescr[0]': monumentDesc,
                'topmostSubform[0].Page1[0].MonumentPrice[0]': this.getPriceWithDecimial(cemeteryContractResult.monument.price),

                'topmostSubform[0].Page1[0].LawnMarkerQty[0]': cemeteryContractResult.lawnMarker.quantity,
                'topmostSubform[0].Page1[0].LawnMarkerItemNum[0]': lmItem,
                'topmostSubform[0].Page1[0].LawnMarkerDescr[0]': lmDesc,
                'topmostSubform[0].Page1[0].LawnMarkerPrice[0]': this.getPriceWithDecimial(cemeteryContractResult.lawnMarker.price),

                'topmostSubform[0].Page1[0].BasesAltarPlateQty[0]': cemeteryContractResult.base.quantity,
                'topmostSubform[0].Page1[0].BasesAltarPlateItemNum[0]': baseItem,
                'topmostSubform[0].Page1[0].BasesAltarPlateDescr[0]': baseDesc,
                'topmostSubform[0].Page1[0].BasesAltarPlatePrice[0]': this.getPriceWithDecimial(cemeteryContractResult.base.price),

                'topmostSubform[0].Page1[0].FoundationSettingFeeQty[0]': cemeteryContractResult.foundation.quantity,
                'topmostSubform[0].Page1[0].FoundationSettingFeeItemNum[0]': foundationItem,
                'topmostSubform[0].Page1[0].FoundationSettingFeeDescr[0]': foundationDesc,
                'topmostSubform[0].Page1[0].FoundationSettingFeePrice[0]': this.getPriceWithDecimial(cemeteryContractResult.foundation.price),

                'topmostSubform[0].Page1[0].VasesPotsQty[0]': cemeteryContractResult.vases.quantity,
                'topmostSubform[0].Page1[0].VasesPotsItemNum[0]': vaseItem,
                'topmostSubform[0].Page1[0].VasesPotsDescr[0]': vaseDesc,
                'topmostSubform[0].Page1[0].VasesPotsPrice[0]': this.getPriceWithDecimial(cemeteryContractResult.vases.price),

                'topmostSubform[0].Page1[0].PhotoQty[0]': cemeteryContractResult.photo.quantity,
                'topmostSubform[0].Page1[0].PhotoItemNum[0]': photoItem,
                'topmostSubform[0].Page1[0].PhotoDescr[0]': photoDesc,
                'topmostSubform[0].Page1[0].PhotoPrice[0]': this.getPriceWithDecimial(cemeteryContractResult.photo.price),

                'topmostSubform[0].Page1[0].UrnQty[0]': cemeteryContractResult.urn.quantity,
                'topmostSubform[0].Page1[0].UrnItemNum[0]': urnItem,
                'topmostSubform[0].Page1[0].UrnDescr[0]': urnDesc,
                'topmostSubform[0].Page1[0].UrnPrice[0]': this.getPriceWithDecimial(cemeteryContractResult.urn.price),

                'topmostSubform[0].Page1[0].AppliquesKeepsakesQty[0]': cemeteryContractResult.keepsake.quantity,
                'topmostSubform[0].Page1[0].AppliquesKeepsakesItemNum[0]': ksItem,
                'topmostSubform[0].Page1[0].AppliquesKeepsakesDescr[0]': ksDesc,
                'topmostSubform[0].Page1[0].AppliquesKeepsakesPrice[0]': this.getPriceWithDecimial(cemeteryContractResult.keepsake.price),

                'topmostSubform[0].Page1[0].CasketQty[0]': cemeteryContractResult.casket.quantity,
                'topmostSubform[0].Page1[0].CasketItemNum[0]': casketItem,
                'topmostSubform[0].Page1[0].CasketDescr[0]': casketDesc,
                'topmostSubform[0].Page1[0].CasketPrice[0]': this.getPriceWithDecimial(cemeteryContractResult.casket.price),

                'topmostSubform[0].Page1[0].InscriptionsScrollsQty[0]': cemeteryContractResult.inscription.quantity,
                'topmostSubform[0].Page1[0].InscriptionsScrollsItemNum[0]': inscItem,
                'topmostSubform[0].Page1[0].InscriptionsScrollsDescr[0]': inscDesc,
                'topmostSubform[0].Page1[0].InscriptionsScrollsPrice[0]': this.getPriceWithDecimial(cemeteryContractResult.inscription.price),

                'topmostSubform[0].Page1[0].OtherQty[0]': cemeteryContractResult.others.quantity,
                'topmostSubform[0].Page1[0].OtherItemNum[0]': otherItem,
                'topmostSubform[0].Page1[0].OtherDescr[0]': otherDesc,
                'topmostSubform[0].Page1[0].OtherPrice[0]': this.getPriceWithDecimial(cemeteryContractResult.others.price),

                'topmostSubform[0].Page1[0].AddedIntermentRightQty[0]': cemeteryContractResult.propertyRightsInfo ? cemeteryContractResult.propertyRightsInfo.additionalRightsCount : 0,
                'topmostSubform[0].Page1[0].AddedIntermentRightPrice[0]': cemeteryContractResult.propertyRightsInfo ? this.getPriceWithDecimial(cemeteryContractResult.propertyRightsInfo.totalAdditionalRightsPrice) : '0.00',

                'topmostSubform[0].Page1[0].EndowmentCareFeeQty[0]': cemeteryContractResult.ecfQuantity ? cemeteryContractResult.ecfQuantity : 0,
                'topmostSubform[0].Page1[0].EndowmentCareFeePrice[0]': this.getPriceWithDecimial(cemeteryContractResult.ecfAmount || 0),

                'topmostSubform[0].Page1[0].DocumentationFeeQty[0]': cemeteryContractResult.CLdoc.quantity,
                'topmostSubform[0].Page1[0].DocumentationFeePrice[0]': this.getPriceWithDecimial(cemeteryContractResult.CLdoc.price),

                'topmostSubform[0].Page1[0].InsAssignmentFeeQty[0]': cemeteryContractResult.CLassign.quantity,
                'topmostSubform[0].Page1[0].InsAssignmentFeePrice[0]': this.getPriceWithDecimial(cemeteryContractResult.CLassign.price),

                'topmostSubform[0].Page1[0].PermitFeeQty[0]': cemeteryContractResult.CLpermit.quantity,
                'topmostSubform[0].Page1[0].PermitFeePrice[0]': this.getPriceWithDecimial(cemeteryContractResult.CLpermit.price),

                'topmostSubform[0].Page1[0].TitleTransferFeeQty[0]': cemeteryContractResult.CLtitle.quantity,
                'topmostSubform[0].Page1[0].TitleTransferFeePrice[0]': this.getPriceWithDecimial(cemeteryContractResult.CLtitle.price),

                'topmostSubform[0].Page1[0].CommitalFeeQty[0]': '', // prefill No
                'topmostSubform[0].Page1[0].CommitalFeePrice[0]': '', // prefill No

                'topmostSubform[0].Page1[0].BequestsQty[0]': cemeteryContractResult.bequestService.quantity,
                'topmostSubform[0].Page1[0].Bequests[0]': bqServItem,
                'topmostSubform[0].Page1[0].BequestsPrice[0]': this.getPriceWithDecimial(cemeteryContractResult.bequestService.price),

                'topmostSubform[0].Page1[0].OtherFeeQty[0]': '',
                'topmostSubform[0].Page1[0].OtherFee[0]': '',
                'topmostSubform[0].Page1[0].OtherFeePrice[0]': '',

                SalesTaxPercent: cemeteryContractResult.salesTaxPercent ? cemeteryContractResult.salesTaxPercent : 0,
                SalesTaxAmount: this.getPriceWithDecimial(cemeteryContractResult.salesTaxAmount),
                'topmostSubform[0].Page1[0].TotalPurchasePrice[0]': this.getPriceWithDecimial(cemeteryContractResult.totalPurchasePrice),
                'topmostSubform[0].Page1[0].PreNeedDiscount[0]': this.getPriceWithDecimial(cemeteryContractResult.preNeedDiscount),
                'topmostSubform[0].Page1[0].CashDiscountPIF[0]': this.getPriceWithDecimial(cemeteryContractResult.cashDiscount),
                'topmostSubform[0].Page1[0].TotalCashPrice[0]': this.getPriceWithDecimial(cemeteryContractResult.totalCashPrice),
                'topmostSubform[0].Page1[0].Credits[0]': this.getPriceWithDecimial(cemeteryContractResult.credits),
                'topmostSubform[0].Page1[0].DownPayment[0]': this.getPriceWithDecimial(cemeteryContractResult.downPayment),
                'topmostSubform[0].Page1[0].AmountFinanced[0]': this.getPriceWithDecimial(cemeteryContractResult.amountFinanced),
                'topmostSubform[0].Page1[0].FinanceCharge[0]': this.getPriceWithDecimial(cemeteryContractResult.financeCharge),
                'topmostSubform[0].Page1[0].TotalOfPayments[0]': this.getPriceWithDecimial(cemeteryContractResult.totalPayments),
                'topmostSubform[0].Page1[0].TotalSalesPrice[0]': this.getPriceWithDecimial(cemeteryContractResult.salesPrice),
                'topmostSubform[0].Page1[0].AnnualPercentageRateDisclosure[0]': cemeteryContractResult.interestRate ? cemeteryContractResult.interestRate : 0,
                'topmostSubform[0].Page1[0].FinanceChargeDisclosure[0]': this.getPriceWithDecimial(cemeteryContractResult.financeCharge),
                'topmostSubform[0].Page1[0].AmountFinancedDisclosure[0]': this.getPriceWithDecimial(cemeteryContractResult.amountFinanced),
                'topmostSubform[0].Page1[0].TotalOfPaymentsDisclosure[0]': this.getPriceWithDecimial(cemeteryContractResult.totalPayments),
                'topmostSubform[0].Page1[0].TotalSalePriceDisclosure[0]': this.getPriceWithDecimial(cemeteryContractResult.salesPrice),
                'topmostSubform[0].Page1[0].NumberOfPaymentsVariable[0]': cemeteryContractResult.noOfPayments ? cemeteryContractResult.noOfPayments - 1 : 0,
                'topmostSubform[0].Page1[0].AmountOfPaymentsVariable[0]': cemeteryContractResult.financeType === 'Special-unequal' ? 'See Appendix' : this.getPriceWithDecimial(repaymentAmount),
                'topmostSubform[0].Page1[0].AmountOfPaymentsOne[0]': cemeteryContractResult.financeType === 'Special-unequal' ? 'See Appendix' : this.getPriceWithDecimial(repaymentAmount), // prefill No
                'topmostSubform[0].Page1[0].WhenPaymentsDue[0]': '', // prefill No
                'topmostSubform[0].Page1[0].PaymentBeginDate[0]': cemeteryContractResult.beginningDate ? timezone ? moment(cemeteryContractResult.beginningDate).tz(timezone).format('MM-DD-YYYY') : moment(cemeteryContractResult.beginningDate).format('MM-DD-YYYY') : '',
                'topmostSubform[0].Page1[0].PaymentEndDate[0]': cemeteryContractResult.dueDate ? timezone ? moment(cemeteryContractResult.dueDate).tz(timezone).format('MM-DD-YYYY') : moment(cemeteryContractResult.dueDate).format('MM-DD-YYYY') : '',
                'topmostSubform[0].Page1[0].Signed_this[0]': `${moment().format('D')}`,
                'topmostSubform[0].Page1[0].day_of[0]': `          ${moment().format('MMM')}`,
                'topmostSubform[0].Page1[0]._20[0]': `${moment().format('YY')}`,
                appendix1: '',
                appendix2: ''
            }

            if ((propLoc || []).length > 40) {
                textdata['topmostSubform[0].Page1[0].LocationName[0]'] = 'See Appendix'
                appendix.push('Location: ' + propLoc)
            }
            if (beneficiaries.length > 10) {
                textdata['topmostSubform[0].Page1[0].RightsForName[0]'] = 'See Appendix'
                appendix.push('Interment Rights For: ' + beneficiaries)
            }
            if (cremServItem.length > 10) {
                textdata['topmostSubform[0].Page1[0].CremationServiceItemNum[0]'] = 'See Appendix'
                appendix.push('Cremation Service Item: ' + cremServItem)
            }
            if (cremServDesc.length > 10) {
                textdata['topmostSubform[0].Page1[0].CremationSvcDescr[0]'] = ' See Appendix'
                appendix.push('Cremation Service Desc: ' + cremServDesc)
            }
            if (cemServItem.length > 10) {
                textdata['topmostSubform[0].Page1[0].CemeteryServiceOCItemNum[0]'] = 'See Appendix'
                appendix.push('Cemetery Service Item: ' + cemServItem)
            }
            if (cemServDesc.length > 10) {
                textdata['topmostSubform[0].Page1[0].CemeteryServiceOCDescr[0]'] = ' See Appendix'
                appendix.push('Cemetery Service Desc: ' + cemServDesc)
            }
            if (vaultItem.length > 10) {
                textdata['topmostSubform[0].Page1[0].VaultLinerContainerItemNum[0]'] = 'See Appendix'
                appendix.push('Vault Item: ' + vaultItem)
            }
            if (vaultDesc.length > 10) {
                textdata['topmostSubform[0].Page1[0].VaultLinerContainerDescr[0]'] = ' See Appendix'
                appendix.push('Vault Desc: ' + vaultDesc)
            }
            if (cryptItem.length > 10) {
                textdata['topmostSubform[0].Page1[0].CryptPlateItemNum[0]'] = 'See Appendix'
                appendix.push('Crypt Plate Item: ' + cryptItem)
            }
            if (cryptDesc.length > 10) {
                textdata['topmostSubform[0].Page1[0].CryptPlateDescr[0]'] = ' See Appendix'
                appendix.push('Crypt Plate Desc: ' + cryptDesc)
            }
            if (nicheItem.length > 10) {
                textdata['topmostSubform[0].Page1[0].NichePlateItemNum[0]'] = 'See Appendix'
                appendix.push('Niche Plate Item: ' + nicheItem)
            }
            if (nicheDesc.length > 10) {
                textdata['topmostSubform[0].Page1[0].NichePlateDescr[0]'] = ' See Appendix'
                appendix.push('Niche Plate Desc: ' + nicheDesc)
            }
            if (monumentItem.length > 10) {
                textdata['topmostSubform[0].Page1[0].MonumentItemNum[0]'] = 'See Appendix'
                appendix.push('Monument Item: ' + monumentItem)
            }
            if (monumentDesc.length > 10) {
                textdata['topmostSubform[0].Page1[0].MonumentDescr[0]'] = ' See Appendix'
                appendix.push('Monument Desc: ' + monumentDesc)
            }
            if (lmItem.length > 10) {
                textdata['topmostSubform[0].Page1[0].LawnMarkerItemNum[0]'] = 'See Appendix'
                appendix.push('Lawn Marker Item: ' + lmItem)
            }
            if (lmDesc.length > 10) {
                textdata['topmostSubform[0].Page1[0].LawnMarkerDescr[0]'] = ' See Appendix'
                appendix.push('Lawn Marker Desc: ' + lmDesc)
            }
            if (baseItem.length > 10) {
                textdata['topmostSubform[0].Page1[0].BasesAltarPlateItemNum[0]'] = 'See Appendix'
                appendix.push('Base Item: ' + baseItem)
            }
            if (baseDesc.length > 10) {
                textdata['topmostSubform[0].Page1[0].BasesAltarPlateDescr[0]'] = ' See Appendix'
                appendix.push('Base Desc: ' + baseDesc)
            }
            if (foundationItem.length > 10) {
                textdata['topmostSubform[0].Page1[0].FoundationSettingFeeItemNum[0]'] = 'See Appendix'
                appendix.push('Foundation Item: ' + foundationDesc)
            }
            if (foundationDesc.length > 10) {
                textdata['topmostSubform[0].Page1[0].FoundationSettingFeeDescr[0]'] = ' See Appendix'
                appendix.push('Foundation Desc: ' + foundationDesc)
            }
            if (vaseItem.length > 10) {
                textdata['topmostSubform[0].Page1[0].VasesPotsItemNum[0]'] = 'See Appendix'
                appendix.push('Vase Item: ' + vaseItem)
            }
            if (vaseDesc.length > 10) {
                textdata['topmostSubform[0].Page1[0].VasesPotsDescr[0]'] = ' See Appendix'
                appendix.push('Vase Desc: ' + vaseDesc)
            }
            if (photoItem.length > 10) {
                textdata['topmostSubform[0].Page1[0].PhotoItemNum[0]'] = 'See Appendix'
                appendix.push('Photo Item: ' + photoItem)
            }
            if (photoDesc.length > 10) {
                textdata['topmostSubform[0].Page1[0].PhotoDescr[0]'] = ' See Appendix'
                appendix.push('Photo Desc: ' + photoDesc)
            }
            if (urnItem.length > 10) {
                textdata['topmostSubform[0].Page1[0].UrnItemNum[0]'] = 'See Appendix'
                appendix.push('Urn Item: ' + urnItem)
            }
            if (urnDesc.length > 10) {
                textdata['topmostSubform[0].Page1[0].UrnDescr[0]'] = ' See Appendix'
                appendix.push('Urn Desc: ' + urnDesc)
            }
            if (ksItem.length > 10) {
                textdata['topmostSubform[0].Page1[0].AppliquesKeepsakesItemNum[0]'] = 'See Appendix'
                appendix.push('Keepsake Item: ' + ksItem)
            }
            if (ksDesc.length > 10) {
                textdata['topmostSubform[0].Page1[0].AppliquesKeepsakesDescr[0]'] = ' See Appendix'
                appendix.push('Keepsake Desc: ' + ksDesc)
            }
            if (casketItem.length > 10) {
                textdata['topmostSubform[0].Page1[0].CasketItemNum[0]'] = 'See Appendix'
                appendix.push('Casket Item: ' + casketItem)
            }
            if (casketDesc.length > 10) {
                textdata['topmostSubform[0].Page1[0].CasketDescr[0]'] = ' See Appendix'
                appendix.push('Casket Desc: ' + casketDesc)
            }
            if (inscItem.length > 10) {
                textdata['topmostSubform[0].Page1[0].InscriptionsScrollsItemNum[0]'] = 'See Appendix'
                appendix.push('Inscription Item: ' + inscItem)
            }
            if (inscDesc.length > 10) {
                textdata['topmostSubform[0].Page1[0].InscriptionsScrollsDescr[0]'] = ' See Appendix'
                appendix.push('Inscription Desc: ' + inscDesc)
            }
            if (otherItem.length > 10) {
                textdata['topmostSubform[0].Page1[0].OtherItemNum[0]'] = 'See Appendix'
                appendix.push('Other Item: ' + otherItem)
            }
            if (otherDesc.length > 10) {
                textdata['topmostSubform[0].Page1[0].OtherDescr[0]'] = ' See Appendix'
                appendix.push('Other Desc: ' + otherDesc)
            }
            if (bqServItem.length > 10) {
                textdata['topmostSubform[0].Page1[0].Bequests[0]'] = 'See Appendix'
                appendix.push('Bequest Item: ' + bqServItem)
            }
            if (cemeteryContractResult.financeType === 'Special-unequal') {
                repaymentAmount = []
                cemeteryContractResult.repaymentAmount.map(rp => {
                    // repaymentAmount.push('$' + `${rp.expectedPaymentAmount} on ${moment(rp.expectedPaymentDate).format('YYYY-MM-DD')}`)
                    repaymentAmount.push(`${this.getPrice(rp.expectedPaymentAmoun)} on ${moment(rp.expectedPaymentDate).format('YYYY-MM-DD')}`)
                })
                repaymentAmount.join(', ')
                appendix.push('Amount of Payments: ' + repaymentAmount)
            }
            let apx = `${appendix.join('\n\n')}`
            if (apx.length < 3800) {
                textdata.appendix1 = apx
            } else {
                textdata.appendix1 = `${appendix.splice(0, Math.ceil(appendix.length / 2)).join('\n\n')}`
                textdata.appendix2 = `${appendix.join('\n\n')}`
            }

            const groupLabelData = {
                clcampus: [
                    { CLC: cemeteryContractResult.MemorialPark },
                    { OM: cemeteryContractResult.OlivetCampus }
                ],
                PropertyType: [
                    { 'SINGLE-SPACE': cemeteryContractResult.singleSpace },
                    { 'LAWN-CRYPT': cemeteryContractResult.lawnCrypt },
                    { ESTATE: cemeteryContractResult.estate },
                    { CRYPT: cemeteryContractResult.crypt },
                    { NICHE: cemeteryContractResult.niche }
                ]
            }
            // fetching data for funeral agreement
            const agreementDetails = await models.Agreement.findOne({
                where: { id: quotationResult.funeralAgreementId },
                include: [{
                    model: models.Location,
                    as: 'location',
                    include: [{
                        model: models.Place,
                        as: 'place',
                        include: [{
                            model: models.Address,
                            as: 'address'
                        }]
                    }]
                },
                {
                    model: models.SaleType,
                    as: 'saleType'
                }]
            })
            // Calling stored procedure to get package, merchandise, services and agreement total's data
            const spResult = await sequelize.query('GetAgreementDetails :agreementId', {
                replacements: { agreementId: quotationResult.funeralAgreementId },
                type: sequelize.QueryTypes.SELECT
            })
            const personremainsInfo = await models.PersonRemainsInfo.findOne({
                where: {
                    personId: quotationResult.personId
                },
                include: [{
                    model: models.PersonRemainsApproval,
                    as: 'personRemainsApproval',
                    where: { type: 'embalming' },
                    required: true
                }]
            })
            if (personremainsInfo) {
                this.agreementDetails.autherizedByFamily = true
            }
            agreementDetails.spResult = spResult
            this.agreementDetails = agreementDetails
            const agreement = this.agreementDetails

            const anticipatedPayment = await getAnticipatedPayments(agreement.id)
            const spresult = agreement ? agreement.spResult : null
            const agreementLocation = agreement ? agreement.location : null
            const {
                line1,
                line2,
                city,
                state,
                country,
                zipcode
            } = agreementLocation && agreementLocation.place ? agreementLocation.place.address : ''
            const purchaserDetails = spresult.find(s => s.roleName === 'Purchaser')
            const musicianDetails = spresult.find(s => s.roleName === 'Musician')

            let purchaserState = purchaserDetails ? purchaserDetails.state : ''
            if (purchaserDetails && purchaserDetails.state) {
                purchaserState = await this.getState(purchaserDetails.state)
            }

            const staffAmount = spresult.find(s => s.lineItemName === 'Baisc service of funeral Director and Staff' && s.itemType === 'Services')
            const embalming = spresult.find(s => s.lineItemName === 'Embalming' && s.itemType === 'Services')
            const otherPreparationAmount = spresult.find(s => s.lineItemName === 'Other preperation of Remains' && s.itemType === 'Services')
            const refrigerationAmount = spresult.find(s => s.lineItemName === 'Refrigeration' && s.itemType === 'Services')
            const funeralServiceAmount = spresult.find(s => s.lineItemName === 'Funeral cemetery at mortuary chappel' && s.itemType === 'Services')
            const visitationAmount = spresult.find(s => s.lineItemName === 'Visitation/Viewing/Vigil Services' && s.itemType === 'Services')
            const additionalvisitationAmount = spresult.find(s => s.lineItemName === 'Additional visitation' && s.itemType === 'Services')
            const memorialServiceAmount = spresult.find(s => s.lineItemName === 'Memorial Service' && s.itemType === 'Services')
            const gravesideServiceAmount = spresult.find(s => s.lineItemName === 'Graveside commital service' && s.itemType === 'Services')
            const consulateServiceAmount = spresult.find(s => s.lineItemName === 'Arrange International Transport with consulate' && s.itemType === 'Services')
            const receptionCenterAmount = spresult.find(s => s.lineItemName === 'Reception center' && s.itemType === 'Services')
            const removalServiceAmount = spresult.find(s => s.lineItemName === 'Local removal from place of death to funeral home' && s.itemType === 'Services')
            const hearseAmount = spresult.find(s => s.lineItemName === 'Casket couch' && s.itemType === 'Services')
            const utilityVehicleAmount = spresult.find(s => s.lineItemName === 'Utility Flower/Vehicle care' && s.itemType === 'Services')
            // const remainsForwardingAmount = spresult.find(s => s.lineItemName === 'Forwarding remains to another Funeral home' && s.itemType === 'Services')
            // const remainsReceivingAmount = spresult.find(s => s.lineItemName === 'Receiving remains from another Funeral Home' && s.itemType === 'Services')
            const otherServiceAmount = spresult.find(s => s.lineItemName === 'OTHER' && s.itemType === 'Services')
            const casket = spresult.find(s => s.lineItemName === 'Casket' && s.itemType === 'Merchandises')
            const urnAmount = spresult.find(s => s.lineItemName === 'Cremation urn' && s.itemType === 'Merchandises')
            const knowledgmentCardAmount = spresult.find(s => s.lineItemName === 'Acknowledgement cards' && s.itemType === 'Merchandises')
            const vistorsRegisterAmount = spresult.find(s => s.lineItemName === 'Visitors register' && s.itemType === 'Merchandises')
            const memorialFolerAmount = spresult.find(s => s.lineItemName === 'Memorial folders/ Prayer cards' && s.itemType === 'Merchandises')
            const clothingAmount = spresult.find(s => s.lineItemName === 'Clothing' && s.itemType === 'Merchandises')
            const cremationContainerAmount = spresult.find(s => s.lineItemName === 'Cremation container' && s.itemType === 'Merchandises')
            const flowerAmount = spresult.find(s => s.lineItemName === 'Flowers' && s.itemType === 'Merchandises')
            const otherMerchandiseAmount = spresult.find(s => s.lineItemName === 'OTHER' && s.itemType === 'Merchandises')
            const deathCertificate = spresult.find(s => s.lineItemName === 'Certified death certificates' && s.itemType === 'Cash Advance')
            const deathCertificateNumber = deathCertificate ? deathCertificate.quantity : ''
            const deathCertificatePrice = deathCertificate ? deathCertificate.totalValue : ''
            const dispositionPermitAmount = spresult.find(s => s.lineItemName === 'Disposition Permit' && s.itemType === 'Cash Advance')
            const coronersFee = spresult.find(s => s.lineItemName === 'Coroners fee' && s.itemType === 'Cash Advance')
            const churchAmount = spresult.find(s => s.lineItemName === 'Church Offering' && s.itemType === 'Cash Advance')
            const clergyAmount = spresult.find(s => s.lineItemName === 'Clergy Honorarium' && s.itemType === 'Cash Advance')
            const musicianAmount = spresult.find(s => s.lineItemName === 'Musician Fee' && s.itemType === 'Cash Advance')
            const sfchronickeAmount = spresult.find(s => s.lineItemName === 'San Francisco Chronicle' && s.itemType === 'Cash Advance')
            const obituaryAmount = spresult.find(s => s.lineItemName === 'Other Newspaper' && s.itemType === 'Cash Advance')
            const limousineAmount = spresult.find(s => s.lineItemName === 'Limousine' && s.itemType === 'Cash Advance')
            const crematoryAmount = spresult.find(s => s.lineItemName === 'Crematory charges' && s.itemType === 'Services')
            const otherCashAdvanceAmount = spresult.find(s => s.lineItemName === 'OTHER' && s.itemType === 'Cash Advance')

            let totalService = spresult.find(s => s.name === 'totalService' && s.itemType === 'Services')
            const totalMerchandise = spresult.find(s => s.name === 'totalMerchandise' && s.itemType === 'Merchandises')
            const totalCashAdvance = spresult.find(s => s.name === 'totalCashAdvance' && s.itemType === 'Cash Advance')

            const packageDetails = spresult.find(s => s.packageName)

            const agreementTotals = spresult.find(s => s.totalPurchasePrice)

            let packageAmount = packageDetails ? this.getPriceWithDecimial(packageDetails.StatementItemPrice) : 0.00
            packageAmount = packageAmount ? packageAmount.replace(/,/gmi, '') : 0.00
            let serviceAmount = totalService ? this.getPriceWithDecimial(totalService.totalValue) : 0.00
            serviceAmount = serviceAmount ? serviceAmount.replace(/,/gmi, '') : 0.00
            if (packageAmount || serviceAmount) {
                totalService = {}
                totalService.totalValue = Number(serviceAmount) + Number(packageAmount)
            }
            const sectionAtotal = await this.getValue(totalService, totalMerchandise)
            const data = {
                FuneralCaseId: contractNumber,
                FuneralAssignedTo: salesCounselor.employee.name,
                EntityLocatiom: agreementLocation ? agreementLocation.name : '',
                EntityLocationFullAddress: `${line1 || ''} ${line2 || ''} ${city || ''} ${state || ''} ${country && country !== 'United States' ? country : ''} ${zipcode || ''}`,
                EntityLocationLicense: agreementLocation ? agreementLocation.license : '',
                EntityLocationPhone: agreementLocation ? formatPhoneNumber(agreementLocation.phoneNumber) : '',

                BeneficiaryFullName: this.personFullName,
                BeneficiaryDOB: this.person.dateOfBirth ? timezone ? moment(this.person.dateOfBirth).tz(timezone).format('MM/DD/YYYY') : moment(this.person.dateOfBirth).format('MM/DD/YYYY') : '',
                PurchaserFullName: purchaserDetails ? purchaserDetails.fullName : '',
                PurchaserRelation: purchaserDetails ? purchaserDetails.relation : '',
                PurchaserAddress: purchaserDetails ? purchaserDetails.address : '',
                PurchaserCity: purchaserDetails ? purchaserDetails.city : '',
                PurchaserState: purchaserState,
                PurchaserZip: purchaserDetails ? purchaserDetails.zipcode : '',
                PurchaserPhone: purchaserDetails ? formatPhoneNumber(purchaserDetails.phoneNumber) : '',

                PackageDescription: packageDetails ? (packageDetails.packageName &&
                    packageDetails.packageName !== 'Direct Cremation' &&
                    packageDetails.packageName !== 'Immediate Burial' &&
                    packageDetails.packageName !== 'Package Forward Remain' &&
                    packageDetails.packageName !== 'Package Received Remain' ? packageDetails.packageName : '') : '',
                PackageAmount: packageDetails ? (packageDetails.packageName &&
                    packageDetails.packageName !== 'Direct Cremation' &&
                    packageDetails.packageName !== 'Immediate Burial' &&
                    packageDetails.packageName !== 'Package Forward Remain' &&
                    packageDetails.packageName !== 'Package Received Remain' ? this.getPriceWithDecimial(packageDetails.StatementItemPrice) : '') : '',
                DirectCremationAmount: packageDetails ? (packageDetails.packageName && packageDetails.packageName === 'Direct Cremation' ? this.getPriceWithDecimial(packageDetails.StatementItemPrice) : '') : '',
                DirectBurialAmount: packageDetails ? (packageDetails.packageName && packageDetails.packageName === 'Immediate Burial' ? this.getPriceWithDecimial(packageDetails.StatementItemPrice) : '') : '',
                StaffAmount: staffAmount ? (staffAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(staffAmount.totalValue)) : '',
                Embalming: embalming ? (embalming.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(embalming.totalValue)) : '',
                'Service with Viewing': '', // prefill no
                'Transport by common carrier': '', // prefill no
                OtherPrepatationAmount: otherPreparationAmount ? (otherPreparationAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(otherPreparationAmount.totalValue)) : '',
                RefrigerationAmount: refrigerationAmount ? (refrigerationAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(refrigerationAmount.totalValue)) : '',
                FuneralServiceAmount: this.agreementDetails.saleType && !['MORT-TCC', 'MORT-TRAD'].includes(this.agreementDetails.saleType.code) && funeralServiceAmount ? (funeralServiceAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(funeralServiceAmount.totalValue)) : '',
                FuneralServiceChurchAmount: this.agreementDetails.saleType && ['MORT-TCC', 'MORT-TRAD'].includes(this.agreementDetails.saleType.code) && funeralServiceAmount ? (funeralServiceAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(funeralServiceAmount.totalValue)) : '',
                VisitationAmount: visitationAmount ? (visitationAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(visitationAmount.totalValue)) : '',
                AdditionalVisitationAmount: additionalvisitationAmount ? (additionalvisitationAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(additionalvisitationAmount.totalValue)) : '',
                MemorialServiceAmount: memorialServiceAmount ? (memorialServiceAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(memorialServiceAmount.totalValue)) : '',
                GravesideServiceAmount: gravesideServiceAmount ? (gravesideServiceAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(gravesideServiceAmount.totalValue)) : '',
                ConsulateServiceAmount: consulateServiceAmount ? (consulateServiceAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(consulateServiceAmount.totalValue)) : '',
                ReceptionCenterAmount: receptionCenterAmount ? (receptionCenterAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(receptionCenterAmount.totalValue)) : '',
                RemovalServiceAmount: removalServiceAmount ? (removalServiceAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(removalServiceAmount.totalValue)) : '',
                HearseAmount: hearseAmount ? (hearseAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(hearseAmount.totalValue)) : '',
                UtilityVehicleAmount: utilityVehicleAmount ? (utilityVehicleAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(utilityVehicleAmount.totalValue)) : '',
                RemainsForwardingAmount: packageDetails && packageDetails.packageName === 'Package Forward Remain' ? this.getPriceWithDecimial(packageDetails.StatementItemPrice) : '',
                RemainsReceivingAmount: packageDetails && packageDetails.packageName === 'Package Received Remain' ? this.getPriceWithDecimial(packageDetails.StatementItemPrice) : '',
                /* RemainsForwardingAmount: remainsForwardingAmount ? (remainsForwardingAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(remainsForwardingAmount.totalValue)) : '',
                RemainsReceivingAmount: remainsReceivingAmount ? (remainsReceivingAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(remainsReceivingAmount.totalValue)) : '', */
                CrematoryAmount: crematoryAmount ? (crematoryAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(crematoryAmount.totalValue)) : '', // not given in excel sheet
                OtherServiceAmount: otherServiceAmount ? this.getPriceWithDecimial(otherServiceAmount.totalValue) : '',
                TotalService: totalService ? this.getPriceWithDecimial(totalService.totalValue) : '',

                CasketDescription: casket ? (casket.packageItemPriceMessage === 'Included' ? 'Incl' : this.removeDuplicateData(casket.descr)) : '',
                CasketAmount: casket ? (casket.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(casket.totalValue)) : '',
                CremationContainerCasket: cremationContainerAmount ? (cremationContainerAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(cremationContainerAmount.totalValue)) : '', // not given in excel sheet
                AirTrayAmount: '', // not given in excel sheet
                UrnAmount: urnAmount ? (urnAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(urnAmount.totalValue)) : '',
                KnowledgementCardAmount: knowledgmentCardAmount ? (knowledgmentCardAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(knowledgmentCardAmount.totalValue)) : '',
                VistorsRegisterAmount: vistorsRegisterAmount ? (vistorsRegisterAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(vistorsRegisterAmount.totalValue)) : '',
                MemorialFolderPrayerCardAmount: memorialFolerAmount ? (memorialFolerAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(memorialFolerAmount.totalValue)) : '',
                ClothingAmount: clothingAmount ? (clothingAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(clothingAmount.totalValue)) : '',
                FlowerAmount: flowerAmount ? (flowerAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(flowerAmount.totalValue)) : '',
                OtherMerchandiseAmount: otherMerchandiseAmount ? this.getPriceWithDecimial(otherMerchandiseAmount.totalValue) : '',
                OtherMerchandise1Amount: '', // prefill no
                AdjustmentAmount: '', // prefill no
                TotalMerchandise: totalMerchandise ? this.getPriceWithDecimial(totalMerchandise.totalValue) : '0.00',
                TotalMerchandise1: totalMerchandise ? this.getPriceWithDecimial(totalMerchandise.totalValue) : '0.00',
                SectionATotal: this.getPriceWithDecimial(sectionAtotal),

                DeathCertificatesNumber: deathCertificateNumber || '',
                DeathCertificatesAmount: deathCertificatePrice ? this.getPriceWithDecimial(deathCertificatePrice) : '',
                DeathCertificatesPrice: (deathCertificatePrice && deathCertificateNumber) ? this.getPriceWithDecimial((deathCertificatePrice / deathCertificateNumber)) : '',
                DispositionPermitAmount: dispositionPermitAmount ? this.getPriceWithDecimial(dispositionPermitAmount.totalValue) : '',
                CoronerFeeAmount: coronersFee ? this.getPriceWithDecimial(coronersFee.totalValue) : '',
                ChurchOfferingAmount: churchAmount ? this.getPriceWithDecimial(churchAmount.totalValue) : '',
                ClergyAmount: clergyAmount ? this.getPriceWithDecimial(clergyAmount.totalValue) : '',
                MusicianAmount: musicianAmount ? this.getPriceWithDecimial(musicianAmount.totalValue) : '',
                MusicianFullName: musicianAmount ? (musicianAmount.totalValue ? (musicianDetails ? musicianDetails.fullName : '') : '') : '',
                Musician1FullName: '', // prefill no
                Musician1Amount: '', // prefill no

                ObituarySFChronicleAmount: sfchronickeAmount ? this.getPriceWithDecimial(sfchronickeAmount.totalValue) : '',
                ObituaryOtherAmount: obituaryAmount ? this.getPriceWithDecimial(obituaryAmount.totalValue) : '',
                ObituaryOther1Amount: '', // prefill no
                CemeteryAmount: '', // not given in excel sheet
                OutsideCrematoryAmount: '', // not given in excel sheet
                LimousineAmount: limousineAmount ? this.getPriceWithDecimial(limousineAmount.totalValue) : '',
                OtherFuneralHomeAmount: '', // not given in excel sheet
                TransportationAmount: '', // not given in excel sheet
                OtherCashAdvanceAmount: otherCashAdvanceAmount ? this.getPriceWithDecimial(otherCashAdvanceAmount.totalValue) : '0.00',
                OtherCashAdvance1Amount: '', // prefill no
                OtherCashAdvance2Amount: '', // prefill no

                TotalCashAdvance: totalCashAdvance ? this.getPriceWithDecimial(totalCashAdvance.totalValue) : '',

                SalesTaxAmount: agreementTotals ? this.getPriceWithDecimial(agreementTotals.totalTax) : '0.00',
                TaxRate: agreementLocation ? this.getPriceWithDecimial(agreementLocation.tax) : '0.00',
                TotalPurchasePrice: agreementTotals ? this.getPriceWithDecimial(agreementTotals.totalPurchasePrice) : '0.00',
                DiscountAmount: agreementTotals ? this.getPriceWithDecimial(agreementTotals.totalAdjustment) : '0.00',
                NetPurchasePrice: agreementTotals ? this.getPriceWithDecimial(agreementTotals.totalCashPrice) : '0.00',
                PaymentAmount: agreementTotals ? this.getPriceWithDecimial(agreementTotals.totalPaid + anticipatedPayment) : '0.00',
                BalanceDue: agreementTotals ? this.getPriceWithDecimial(agreementTotals.due - anticipatedPayment) : '0.00',
                dateOfQuote: metaData.timezone ? moment().tz(metaData.timezone).format('MM/DD/YYYY') : moment().format('MM/DD/YYYY')
            }

            const checkboxData = {
                'Authorized by family': agreement ? agreement.autherizedByFamily : false
            }
            return this.convertToTextTabsLatest(salesCounselor, { ...textdata, ...data }, checkboxData, groupLabelData)
        }
    }
    purchaserPreFillData () {
        const purchaser = this.getSignerByRole(ROLES.purchaser, this.formId)
        const purchaserData = purchaser.agreementPerson ? purchaser.agreementPerson.person : null
        const data = {
            'topmostSubform[0].Page1[0].PurchaserHomePhone[0]': purchaserData.phoneNumber ? formatPhoneNumber(purchaserData.phoneNumber) : ''
        }
        return this.convertToTextTabsLatest(purchaser, data)
    }
    removeDuplicateData (str) {
        if (str) {
            return Array.from(new Set(str.split(','))).join(',')
        }
        return ''
    }
    salesManagerPreFillData () {
        const salesManager = this.getSignerByRole(ROLES.salesManager, this.formId)
        const data = {
            'topmostSubform[0].Page1[0].PurchaserHomePhone[2]': salesManager ? (salesManager.employee ? formatPhoneNumber(salesManager.employee.phoneNumber) : '') : ''
        }
        return this.convertToTextTabsLatest(salesManager, data)
    }
}
module.exports = QuotationForm
