const BaseForm = require('./baseForm')
const _ = require('lodash')

const ROLES = {
    purchaser: 'Owner',
    coPurchaser: 'Co-Owner',
    assignee1: 'Assignee1',
    assignee2: 'Assignee2',
    salesCounselor: 'Sales Counselor'
}

class AssignmentOfContractAndIntermentRights extends BaseForm {
    constructor (caseInfoData) {
        let caseInfoFormId = caseInfoData.caseInfoFormId
        super({ caseInfoFormId })
        this.formId = caseInfoData.formId
    }

    async envelopeData () {
        return [
            await this.salesCounselorPreFillData(),
            this.purchaserPreFillData(),
            this.coPurchaserPreFillData(),
            this.assignee1PreFillData(),
            this.assignee2PreFillData()
        ]
    }

    async salesCounselorPreFillData () {
        const salesCounselor = this.getSignerByRole(ROLES.salesCounselor, this.formId)
        const agmntDetails = await this.getAgreementPropertyLocation()
        const agmntLocation = _.get(agmntDetails, 'agreementProperties[0].property.propertyGardens.propertyCampus.name')
        const textData = {}
        let checkboxData = {
            CLMemorialPark: !(agmntDetails && agmntLocation === 'Olivet campus'),
            CLOlivetCampus: !!(agmntDetails && agmntLocation === 'Olivet campus')
        }
        return this.convertToTextTabsLatest(salesCounselor, textData, checkboxData)
    }

    purchaserPreFillData () {
        const purchaser = this.getSignerByRole(ROLES.purchaser, this.formId)
        const textData = {}
        return this.convertToTextTabsLatest(purchaser, textData)
    }

    coPurchaserPreFillData () {
        const coPurchaser = this.getSignerByRole(ROLES.coPurchaser, this.formId)
        const textData = {}
        return this.convertToTextTabsLatest(coPurchaser, textData)
    }

    assignee1PreFillData () {
        const assignee = this.getSignerByRole(ROLES.assignee1, this.formId)
        const textData = {}
        return this.convertToTextTabsLatest(assignee, textData)
    }

    assignee2PreFillData () {
        const assignee = this.getSignerByRole(ROLES.assignee2, this.formId)
        const textData = {}
        return this.convertToTextTabsLatest(assignee, textData)
    }
}
module.exports = AssignmentOfContractAndIntermentRights
