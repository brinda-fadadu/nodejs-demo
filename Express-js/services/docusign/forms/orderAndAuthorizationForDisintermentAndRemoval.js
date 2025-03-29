const moment = require('moment')
const BaseForm = require('./baseForm')
const { formatPhoneNumber } = require('../../../utils/formatters')
const _ = require('lodash')

const ROLES = {
    legalRepresentative1: 'Legal Representative1',
    legalRepresentative2: 'Legal Representative2',
    owner: 'Owner',
    salesCounselor: 'Sales Counselor'
}

class OrderAndAuthorizationForDisintermentAndRemoval extends BaseForm {
    constructor (caseInfoData) {
        let caseInfoFormId = caseInfoData.caseInfoFormId
        super({ caseInfoFormId })
        this.formId = caseInfoData.formId
    }

    async envelopeData () {
        return [
            await this.salesCounselorPrefillData(),
            this.legalRep1PreFillData(),
            this.legalRep2PreFillData(),
            this.ownerPreFillData()
        ]
    }

    async salesCounselorPrefillData () {
        const salesCounselor = this.getSignerByRole(ROLES.salesCounselor, this.formId)
        const agmntDetails = await this.getAgreementPropertyLocation()
        const agmntLocation = _.get(agmntDetails, 'agreementProperties[0].property.propertyGardens.propertyCampus.name')
        let props = agmntDetails.agreementProperties
        if (props.length) {
            props = props.map(e => {
                return e.property.name
            })
        }
        const textData = {
            date: moment().format('MM/DD/YYYY'),
            decedentName: [this.person.firstName, this.person.middleName, this.person.lastName].join(' ').trim(),
            propertyNamewithLocation: `${props.join(', ')} - ${(agmntDetails && agmntDetails.location) ? agmntDetails.location.name : ''}`
        }
        let checkboxData = {
            CLMemorialPark: !(agmntDetails && agmntLocation === 'Olivet campus'),
            CLOlivetCampus: !!(agmntDetails && agmntLocation === 'Olivet campus')
        }
        return this.convertToTextTabsLatest(salesCounselor, textData, checkboxData)
    }

    legalRep1PreFillData () {
        const legalRep1 = this.getSignerByRole(ROLES.legalRepresentative1, this.formId)
        const textData = {
            phone1: legalRep1 ? formatPhoneNumber(legalRep1.personContact.person.phoneNumber) : ''
        }
        return this.convertToTextTabsLatest(legalRep1, textData)
    }

    legalRep2PreFillData () {
        const legalRep2 = this.getSignerByRole(ROLES.legalRepresentative2, this.formId)
        const textData = {
            phone2: legalRep2 ? formatPhoneNumber(legalRep2.personContact.person.phoneNumber) : ''
        }
        return this.convertToTextTabsLatest(legalRep2, textData)
    }

    ownerPreFillData () {
        const owner = this.getSignerByRole(ROLES.owner, this.formId)
        const textData = {}
        return this.convertToTextTabsLatest(owner, textData)
    }
}
module.exports = OrderAndAuthorizationForDisintermentAndRemoval
