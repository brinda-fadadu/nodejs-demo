const moment = require('moment-timezone')
const models = require('../../../models')
const BaseForm = require('./baseForm')
const { sequelize } = require('../../../models')
const { formatPhoneNumber } = require('../../../utils/formatters')
const { getAnticipatedPayments } = require('./funeralFormsHelper')

const ROLES = {
    FuneralAssignedTo: 'FuneralAssignedTo',
    Purchaser: 'Purchaser',
    CoPurchaser: 'Co-Purchaser'
}

class PnStatementOfGoodsAndServicesInsurance extends BaseForm {
    constructor ({ caseInfoFormId, formId }, caseInfoForm, person) {
        super({ caseInfoFormId })
        if (caseInfoForm) {
            this.caseInfoForm = caseInfoForm
        }
        if (person) {
            this.person = person
        }
        this.formId = formId
    }

    async envelopeData () {
        return [
            await this.funeralAssignedToPreFillData(),
            this.purchaserPreFillData(),
            this.coPurchaserPreFillData()
        ]
    }

    async getValue (services, merchandise) {
        const servicesValue = services ? Number(services.totalValue) : 0.0
        const merchandiseValue = merchandise ? Number(merchandise.totalValue) : 0.0
        return servicesValue + merchandiseValue
    }

    async getAgreementDetails (caseInfoForm) {
        this.agreementDetails = {}
        if (caseInfoForm.agreementId) {
            const agreementDetails = await models.Agreement.findOne({
                where: { id: caseInfoForm.agreementId },
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
                }]
            })
            this.agreementDetails = agreementDetails

            // fetching the in progress addendum
            const addendum = await models.Addendum.findOne({
                where: {
                    agreementId: caseInfoForm.agreementId,
                    status: 'In progress'
                }
            })
            if (addendum) {
                this.agreementDetails.contractNumber = addendum.addendumNumber
            }

            // Calling stored procedure to get package, merchandise, services and agreement total's data
            const spResult = await sequelize.query('GetAgreementDetails :agreementId', {
                replacements: { agreementId: this.caseInfoForm.agreementId },
                type: sequelize.QueryTypes.SELECT
            })
            this.agreementDetails.spResult = spResult
            const personremainsInfo = await models.PersonRemainsInfo.findOne({
                where: {
                    personId: caseInfoForm.personId
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
        }
    }
    async funeralAssignedToPreFillReuseData (funeralAssignedTo) {
        // let metaData = this.caseInfoForm.metaData ? JSON.parse(this.caseInfoForm.metaData.replace(/'/g, '"')) : ''
        let metaData = this.caseInfoForm.metaData ? JSON.parse(this.caseInfoForm.metaData) : ''

        let timezone = metaData.timezone ? metaData.timezone : null
        await this.getAgreementDetails(this.caseInfoForm)
        const anticipatedPayment = await getAnticipatedPayments(this.caseInfoForm.agreementId)

        const agreement = this.agreementDetails
        const spresult = agreement ? agreement.spResult : null
        const agreementLocation = agreement ? agreement.location : null
        const { line1, line2, city, state, country, zipcode } = agreementLocation.place ? agreementLocation.place.address : ''
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
            FuneralCaseId: agreement ? agreement.contractNumber : '',
            FuneralAssignedTo: funeralAssignedTo.employee.name,
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
            FuneralServiceAmountAndFuneralServiceChurchAmount: funeralServiceAmount ? (funeralServiceAmount.packageItemPriceMessage === 'Included' ? 'Incl' : this.getPriceWithDecimial(funeralServiceAmount.totalValue)) : '',
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
            BalanceDue: agreementTotals ? this.getPriceWithDecimial(agreementTotals.due - anticipatedPayment) : '0.00'
        }

        const checkboxData = {
            'Authorized by family': agreement ? agreement.autherizedByFamily : false
        }
        return { data, checkboxData }
    }

    async funeralAssignedToPreFillData () {
        const funeralAssignedTo = this.getSignerByRole(ROLES.FuneralAssignedTo, this.formId)
        const { data, checkboxData } = await this.funeralAssignedToPreFillReuseData(funeralAssignedTo)
        return this.convertToTextTabsLatest(funeralAssignedTo, data, checkboxData)
    }
    purchaserPreFillData () {
        const purchaser = this.getSignerByRole(ROLES.Purchaser, this.formId)
        const data = {}
        return this.convertToTextTabsLatest(purchaser, data)
    }

    removeDuplicateData (str) {
        if (str) {
            return Array.from(new Set(str.split(','))).join(',')
        }
        return ''
    }

    coPurchaserPreFillData () {
        const coPurchaser = this.getSignerByRole(ROLES.CoPurchaser, this.formId)
        const data = {}
        return this.convertToTextTabsLatest(coPurchaser, data)
    }
}

module.exports = PnStatementOfGoodsAndServicesInsurance
