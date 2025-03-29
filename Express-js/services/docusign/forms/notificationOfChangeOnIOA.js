const moment = require('moment')
const BaseForm = require('./baseForm')
const _ = require('lodash')
const ROLES = {
    Arranger: 'Arranger',
    Manager: 'Manager'
}

class NotificationOfChangeOnIOAForm extends BaseForm {
    constructor ({ caseInfoFormId, formId }) {
        super({ caseInfoFormId })
        this.formId = formId
    }

    async envelopeData () {
        return [
            await this.arrangerPreFillData(),
            this.managerPreFillData()
        ]
    }

    async arrangerPreFillData () {
        const arranger = this.getSignerByRole(ROLES.Arranger, this.formId)
        let agmntDetails = await this.getAgreementPropertyLocation()
        const agmntLocation = _.get(agmntDetails, 'agreementProperties[0].property.propertyGardens.propertyCampus.name')
        const textData = {
            currentDate: moment().format('MM/DD/YYYY')
        }
        const checkboxData = {
            CLMemorialPark1: !(agmntDetails && agmntLocation === 'Olivet campus'),
            CLOlivetCampus1: !!(agmntDetails && agmntLocation === 'Olivet campus')
        }
        return this.convertToTextTabsLatest(arranger, textData, checkboxData)
    }

    managerPreFillData () {
        const managerData = this.getSignerByRole(ROLES.Manager)
        const data = {}
        return this.convertToTextTabsLatest(managerData, data)
    }
}

module.exports = NotificationOfChangeOnIOAForm
