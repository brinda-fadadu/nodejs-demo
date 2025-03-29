const moment = require('moment')
const BaseForm = require('./baseForm')
const models = require('../../../models')
const _ = require('lodash')
const ROLES = {
    salesCounselor: 'Sales Counselor',
    Purchaser: 'Purchaser'
}

class NoticeOfRightToCancelForm extends BaseForm {
    constructor ({ caseInfoFormId, formId }) {
        super({ caseInfoFormId })
        this.formId = formId
    }

    async envelopeData () {
        return [
            await this.salesCounselorPreFillData(),
            this.purchaserPreFillData()
        ]
    }

    async noticeOfRightToCancelFormDataForReUse (personId, agreementId) {
        const idOfPerson = personId || this.person.id
        const agreementDetails = await models.AgreementPerson.findOne({
            where: {
                personId: idOfPerson,
                deletedBy: null,
                deletedAt: null
            },
            include: [{
                model: models.Agreement,
                where: {
                    id: agreementId || this.caseInfoForm.agreementId
                }
            }]
        })
        let agmntDetails
        if (_.get(agreementDetails, 'Agreement.id')) {
            agmntDetails = await this.getAgreementPropertyLocation(_.get(agreementDetails, 'Agreement.id'))
        }
        const agmntLocation = _.get(agmntDetails, 'agreementProperties[0].property.propertyGardens.propertyCampus.name')
        let checkboxData = {
            CLMemorialPark: !(agmntDetails && agmntLocation === 'Olivet campus'),
            CLOlivetCampus: !!(agmntDetails && agmntLocation === 'Olivet campus')
        }

        const textData = {
            contractNumber: _.get(agreementDetails, 'Agreement.contractNumber'),
            contractDate: moment().format('MM/DD/YYYY'),
            CancelationDate: moment().add(30, 'days').format('MM/DD/YYYY')
        }
        return { textData, checkboxData }
    }

    async salesCounselorPreFillData () {
        const funeralAssignedTo = this.getSignerByRole(ROLES.salesCounselor, this.formId)
        const { textData, checkboxData } = await this.noticeOfRightToCancelFormDataForReUse()
        return this.convertToTextTabsLatest(funeralAssignedTo, textData, checkboxData)
    }

    purchaserPreFillData () {
        const purchaserData = this.getSignerByRole(ROLES.Purchaser, this.formId)
        const data = {
        }
        return this.convertToTextTabsLatest(purchaserData, data)
    }
}

module.exports = NoticeOfRightToCancelForm
