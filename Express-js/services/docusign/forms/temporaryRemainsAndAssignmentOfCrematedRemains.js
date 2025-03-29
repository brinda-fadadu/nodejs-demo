const BaseForm = require('./baseForm')
const models = require('../../../models')
const _ = require('lodash')

const ROLES = {
    legalRepresentative: 'Legal Representative1',
    Staff: 'Staff'
}

class TemporaryRemainsAndAssignmentOfCrematedRemains extends BaseForm {
    constructor (caseInfoData) {
        let caseInfoFormId = caseInfoData.caseInfoFormId
        super({ caseInfoFormId })
        this.personId = caseInfoData.personId
        this.formId = caseInfoData.formId
    }

    async envelopeData () {
        return [
            await this.StaffPreFillData(),
            this.legalRepresentativePreFillData()
    
    }

    legalRepresentativePreFillData () {
        const legalRep = this.getSignerByRole(ROLES.legalRepresentative, this.formId)
        const textData = {
            crematedRemainsInfo: ''
        }
        return this.convertToTextTabsLatest(legalRep, textData)
    }

    async StaffPreFillData () {
        const Staff = this.getSignerByRole(ROLES.Staff, this.formId)
        const agmntDetails = await this.getAgreementPropertyLocation()
        const legalRep = this.getSignerByRole(ROLES.legalRepresentative, this.formId)
        const agmntLocation = _.get(agmntDetails, 'agreementProperties[0].property.propertyGardens.propertyCampus.name')
        let personDetails = await this.fetchPersonDetails()
        const textData = {
            legalRepresentativeName: _.get(legalRep, 'personContact.person') ? this.getPersonFullName(_.get(legalRep, 'personContact.person')) : '',
            decedentName: [personDetails.firstName, personDetails.middleName, personDetails.lastName].join(' ').trim(),
            relation: legalRep && legalRep.personContact && legalRep.personContact.relation && legalRep.personContact.relation.name ? legalRep.personContact.relation.name : null,
            legalRepresentativeName1: _.get(legalRep, 'personContact.person') ? this.getPersonFullName(_.get(legalRep, 'personContact.person')) : '',
            scheduleDateAndTime: '',
            decedentName1: [personDetails.firstName, personDetails.middleName, personDetails.lastName].join(' ').trim(),
            contractNumber: agmntDetails && agmntDetails.contractNumber ? agmntDetails.contractNumber : null,
            cremationNumber: '',
            deliveryDate: '',
            deliveryTime: '',
            AM: '',
            PM: ''
        }
        let checkboxData = {
            CLMemorialPark: !(agmntDetails && agmntLocation === 'Olivet campus'),
            CLOlivetCampus: !!(agmntDetails && agmntLocation === 'Olivet campus')
        }
        return this.convertToTextTabsLatest(Staff, textData, checkboxData)
    }
    getPersonFullName (person) {
        return [person.firstName, person.middleName, person.lastName].join(' ').trim()
    }
    async fetchPersonDetails () {
        let person = await models.Person.findOne({
            where: { id: this.personId }
        })
        return person
    }
}
module.exports = TemporaryRemainsAndAssignmentOfCrematedRemains
