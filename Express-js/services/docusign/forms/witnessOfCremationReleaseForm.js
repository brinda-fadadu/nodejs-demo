const moment = require('moment')
const BaseForm = require('./baseForm')
const _ = require('lodash')

const ROLES = {
    AssignedTo: 'AssignedTo',
    Witness1: 'Witness1',
    Witness2: 'Witness2',
    Witness3: 'Witness3',
    Witness4: 'Witness4',
    Witness5: 'Witness5',
    Witness6: 'Witness6'

}

class WitnessOfCremationReleaseForm extends BaseForm {
    constructor ({ caseInfoFormId, formId }) {
        super({ caseInfoFormId })
        this.formId = formId
    }

    async envelopeData () {
        return [
            this.assignedToPreFillData(),
            await this.witness1PrefillData(),
            await this.witness2PreFillData(),
            await this.witness3PreFillData(),
            await this.witness4PreFillData(),
            await this.witness5PreFillData(),
            await this.witness6PreFillData()
        ]
    }

    getFullName (person) {
        return [person.firstName, person.middleName, person.lastName]
            .join(' ')
            .trim()
    }

    assignedToPreFillData () {
        const assignedToData = this.getSignerByRole(ROLES.AssignedTo, this.formId)

        const data = {
            DecedentFullName: _.get(this, 'personFullName', ''),
            StaffFullName: assignedToData && assignedToData.employee ? assignedToData.employee.name : ''
        }

        return this.convertToTextTabsLatest(assignedToData, data)
    }

    async witness1PrefillData () {
        // let metaData = this.caseInfoForm.metaData ? JSON.parse(this.caseInfoForm.metaData.replace(/'/g, '"')) : ''
        let metaData = this.caseInfoForm.metaData ? JSON.parse(this.caseInfoForm.metaData) : ''

        let timezone = metaData.timezone ? metaData.timezone : null
        const witness = this.getSignerByRole(
            ROLES.Witness1, this.formId
        )
        const curDate = timezone ? moment().tz(timezone) : moment()
        const witnessPersonData = witness ? (witness.personContact ? witness.personContact.person : null) : null
        const textData = {
            DD: curDate.format('DD'),
            MM: curDate.format('MM'),
            YY: curDate.format('YY'),
            Witness1FullName: witnessPersonData ? this.getFullName(witnessPersonData) : '',
            Witness1Address: witnessPersonData ? witnessPersonData.addressPlace ? await this.getAddress(witnessPersonData.addressPlace.address) : '' : ''
        }
        return this.convertToTextTabsLatest(witness, textData)
    }

    async witness2PreFillData () {
        const witness = this.getSignerByRole(
            ROLES.Witness2, this.formId
        )
        const witnessPersonData = witness ? (witness.personContact ? witness.personContact.person : null) : null
        const textData = {
            Witness2FullName: witnessPersonData ? this.getFullName(witnessPersonData) : '',
            Witness2Address: witnessPersonData ? witnessPersonData.addressPlace ? await this.getAddress(witnessPersonData.addressPlace.address) : '' : ''
        }
        return this.convertToTextTabsLatest(witness, textData)
    }

    async witness3PreFillData () {
        const witness = this.getSignerByRole(
            ROLES.Witness3, this.formId
        )
        const witnessPersonData = witness ? (witness.personContact ? witness.personContact.person : null) : null
        const textData = {
            Witness3FullName: witnessPersonData ? this.getFullName(witnessPersonData) : '',
            Witness3Address: witnessPersonData ? witnessPersonData.addressPlace ? await this.getAddress(witnessPersonData.addressPlace.address) : '' : ''
        }
        return this.convertToTextTabsLatest(witness, textData)
    }

    async witness4PreFillData () {
        const witness = this.getSignerByRole(
            ROLES.Witness4, this.formId
        )
        const witnessPersonData = witness ? (witness.personContact ? witness.personContact.person : null) : null
        const textData = {
            Witness4FullName: witnessPersonData ? this.getFullName(witnessPersonData) : '',
            Witness4Address: witnessPersonData ? witnessPersonData.addressPlace ? await this.getAddress(witnessPersonData.addressPlace.address) : '' : ''
        }
        return this.convertToTextTabsLatest(witness, textData)
    }

    async witness5PreFillData () {
        const witness = this.getSignerByRole(
            ROLES.Witness5, this.formId
        )
        const witnessPersonData = witness ? (witness.personContact ? witness.personContact.person : null) : null
        const textData = {
            Witness5FullName: witnessPersonData ? this.getFullName(witnessPersonData) : '',
            Witness5Address: witnessPersonData ? witnessPersonData.addressPlace ? await this.getAddress(witnessPersonData.addressPlace.address) : '' : ''
        }
        return this.convertToTextTabsLatest(witness, textData)
    }

    async witness6PreFillData () {
        const witness = this.getSignerByRole(
            ROLES.Witness6, this.formId
        )
        const witnessPersonData = witness ? (witness.personContact ? witness.personContact.person : null) : null
        const textData = {
            Witness6FullName: witnessPersonData ? this.getFullName(witnessPersonData) : '',
            Witness6Address: witnessPersonData ? witnessPersonData.addressPlace ? await this.getAddress(witnessPersonData.addressPlace.address) : '' : ''
        }
        return this.convertToTextTabsLatest(witness, textData)
    }
}

module.exports = WitnessOfCremationReleaseForm
