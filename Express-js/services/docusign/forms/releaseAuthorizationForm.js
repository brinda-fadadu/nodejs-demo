const moment = require('moment')
const BaseForm = require('./baseForm')
const _ = require('lodash')
const ROLES = {
    FuneralAssignedTo: 'FuneralAssignedTo',
    FuneralAuthorizer: 'FuneralAuthorizer'
}

class ReleaseAuthorizationForm extends BaseForm {
    constructor ({ caseInfoFormId, formId }) {
        super({ caseInfoFormId })
        this.formId = formId
    }
    async envelopeData () {
        return [
            await this.funeralAssignedToPreFillData(),
            this.funeralAuthorizerPreFillData()
        ]
    }
    async funeralAssignedToPreFillData () {
        const getLocationOfRemainsData = await this.getLocationOfRemains(this.person.personRemainsTransferInfo[0])
        const funeralAssignedTo = this.getSignerByRole(ROLES.FuneralAssignedTo, this.formId)
        let anstmtData = await this.fetchANStmtDetails(this.person.id)
        anstmtData = anstmtData ? (anstmtData.Agreement ? anstmtData.Agreement : null) : null
        const data = {
            EntityLocation: anstmtData && anstmtData.location ? anstmtData.location.name : '',
            EntityFullAddress: anstmtData && anstmtData.location && anstmtData.location.place && anstmtData.location.place.address ? [anstmtData.location.place.address.line1, anstmtData.location.place.address.line2].join(' ').trim() : '',
            EntityCity: anstmtData && anstmtData.location && anstmtData.location.place && anstmtData.location.place.address ? anstmtData.location.place.address.city : '',
            EntityState: anstmtData && anstmtData.location && anstmtData.location.place && anstmtData.location.place.address ? await this.getState(anstmtData.location.place.address.state) : '',
            EntityZip: anstmtData && anstmtData.location && anstmtData.location.place && anstmtData.location.place.address ? anstmtData.location.place.address.zipcode : '',
            EntityPhone: anstmtData && anstmtData.location ? anstmtData.location.phoneNumber : '',
            EntityFax: anstmtData && anstmtData.location ? anstmtData.location.fax : '',
            EntityContactEmail: '',
            EntityLicense: anstmtData && anstmtData.location ? anstmtData.location.license : '',
            DecedentFullName: _.get(this, 'personFullName', ''),
            DecedentDoB: this.person.dateOfBirth ? moment(this.person.dateOfBirth).format('MM/DD/YYYY') : '',
            DecedentDoD: this.person.deathDetails ? (this.person.deathDetails.dateOfDeath ? moment(this.person.deathDetails.dateOfDeath).format('MM/DD/YYYY') : '') : '',
            LocationOfRemains: getLocationOfRemainsData || '',
            FuneralAssignedTo: _.get(funeralAssignedTo.employee, 'Name', ''),
            FuneralAssignedToRole: ''
        }

        return this.convertToTextTabsLatest(funeralAssignedTo, data)
    }

    funeralAuthorizerPreFillData () {
        const funeralAuthorizer = this.getSignerByRole(
            ROLES.FuneralAuthorizer, this.formId
        )
        const personContactDetails = this.personContactDetails
        const data = {
            FuneralAuthorizer: _.get(personContactDetails, 'fullName', ''),
            FuneralAuthorizerRelation: _.get(personContactDetails, 'relation', '')
        }

        return this.convertToTextTabsLatest(funeralAuthorizer, data)
    }
}

module.exports = ReleaseAuthorizationForm
