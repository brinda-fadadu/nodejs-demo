const BaseForm = require('./baseForm')
const models = require('../../../models')
const moment = require('moment')
const _ = require('lodash')

const ROLES = {
    SalesCounselor: 'Sales Counselor',
    Purchaser: 'Purchaser',
    CoPurchaser1: 'Co-Purchaser1',
    CoPurchaser2: 'Co-Purchaser2',
    CoPurchaser3: 'Co-Purchaser3'
}

class AknowledgmenttoRetailInstallmentAgreementPurchaseOfPNCemeteryOopeningAndClosingServices extends BaseForm {
    constructor ({ caseInfoFormId, formId }) {
        super({ caseInfoFormId })
        this.formId = formId
    }
    async envelopeData () {
        return [
            await this.salesCounselorPreFillData(),
            this.purchaserPreFillData(),
            this.coPurchaser1PreFillData(),
            this.coPurchaser2PreFillData(),
            this.coPurchaser3PreFillData()
        ]
    }

    async getAgreementDetails () {
        const agmntDetails = await models.Agreement.findOne({
            where: { id: this.caseInfoForm.agreementId },
            include: [
                {
                    model: models.AgreementPerson,
                    as: 'coPurchasers',
                    include: [{
                        model: models.Person,
                        as: 'person'
                    }],
                    required: false
                }, {
                    model: models.AgreementPerson,
                    as: 'purchaser',
                    include: [{
                        model: models.Person,
                        as: 'person'
                    }]
                }
            ]
        })
        return agmntDetails
    }

    async getNames (agmntDetails) {
        let names = ''
        if (agmntDetails && agmntDetails.purchaser && agmntDetails.purchaser.person) {
            names = [agmntDetails.purchaser.person.firstName, agmntDetails.purchaser.person.middleName, agmntDetails.purchaser.person.lastName].join(' ').trim()
        }
        if (agmntDetails && agmntDetails.coPurchasers && agmntDetails.coPurchasers.length) {
            agmntDetails.coPurchasers.map(cop => {
                if (cop.person) {
                    names = names + ', ' + [cop.person.firstName, cop.person.middleName, cop.person.lastName].join(' ').trim()
                }
            })
        }
        return names
    }

    async salesCounselorPreFillData () {
        const salesCounselor = this.getSignerByRole(ROLES.SalesCounselor, this.formId)
        let agmntDetails = await this.getAgreementDetails()
        const agmntData = await this.getAgreementPropertyLocation()
        const agmntLocation = _.get(agmntData, 'agreementProperties[0].property.propertyGardens.propertyCampus.name')
        const purchaserAndCopurchaserNames = await this.getNames(agmntDetails)

        const data = {
            contractNumber: agmntDetails && agmntDetails.contractNumber ? agmntDetails.contractNumber : '',
            contractDate: moment().format('MM/DD/YYYY'),
            purchaserNameAndAvilableCopurchasersNames: purchaserAndCopurchaserNames.length <= 50 ? purchaserAndCopurchaserNames : 'See Appendix',
            purchaserNameAndAvilableCopurchasersNamesAppendix: purchaserAndCopurchaserNames.length >= 50 ? purchaserAndCopurchaserNames : ''
        }

        let checkboxData = {
            CLMemorialPark: !(agmntData && agmntLocation === 'Olivet campus'),
            CLOlivetCampus: !!(agmntData && agmntLocation === 'Olivet campus')
        }
        return this.convertToTextTabsLatest(salesCounselor, data, checkboxData)
    }

    purchaserPreFillData () {
        const purchaser = this.getSignerByRole(ROLES.Purchaser, this.formId)
        const data = {}
        return this.convertToTextTabsLatest(purchaser, data)
    }

    coPurchaser1PreFillData () {
        const coPurchaser1 = this.getSignerByRole(ROLES.CoPurchaser1, this.formId)
        const data = {}
        return this.convertToTextTabsLatest(coPurchaser1, data)
    }

    coPurchaser2PreFillData () {
        const coPurchaser2 = this.getSignerByRole(ROLES.CoPurchaser2, this.formId)
        const data = {}
        return this.convertToTextTabsLatest(coPurchaser2, data)
    }

    coPurchaser3PreFillData () {
        const coPurchaser3 = this.getSignerByRole(ROLES.CoPurchaser3, this.formId)
        const data = {}
        return this.convertToTextTabsLatest(coPurchaser3, data)
    }
}
module.exports = AknowledgmenttoRetailInstallmentAgreementPurchaseOfPNCemeteryOopeningAndClosingServices
