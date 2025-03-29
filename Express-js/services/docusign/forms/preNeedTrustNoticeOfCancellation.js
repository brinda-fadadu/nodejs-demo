const BaseForm = require('./baseForm')
const models = require('../../../models')
const moment = require('moment')
const _ = require('lodash')

const ROLES = {
    Arranger: 'Arranger',
    Purchaser: 'Purchaser'

}

class PreNeedTrustNoticeOfCancellation extends BaseForm {
    constructor ({ caseInfoFormId, formId }) {
        super({ caseInfoFormId })
        this.formId = formId
    }

    async envelopeData () {
        return [
            await this.arrangerPrefillData(),
            this.purchaserPreFillData()
        ]
    }

    async fetchAgreementDetails (agreementId) {
        try {
            let submissionDate = null
            const agreement = await models.Agreement.findOne({
                where: { id: agreementId },
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
            if (agreement.status === 'Submitted') {
                const addendum = await models.Addendum.findAll({
                    where: { agreementId: agreementId, status: 'Submitted' },
                    order: [
                        [
                            'createdAt',
                            'DESC'
                        ]
                    ]
                })
                submissionDate = addendum.length ? addendum[0].updatedAt : agreement.updatedAt
            }
            return { agreement, submissionDate }
        } catch (err) {
            throw err
        }
    }

    async arrangerPrefillData () {
        const arranger = this.getSignerByRole(
            ROLES.Arranger, this.formId
        )
        const agmntDetails = await this.fetchAgreementDetails(this.caseInfoForm.agreementId)
        const location = agmntDetails ? _.get(agmntDetails, 'agreement.location', null) : null
        const locAddress = agmntDetails ? _.get(agmntDetails, 'agreement.location.place.address', null) : null
        let metaData = this.caseInfoForm.metaData ? JSON.parse(this.caseInfoForm.metaData) : ''
        let timezone = metaData.timezone ? metaData.timezone : null
        let submissionDate = agmntDetails.submissionDate ? moment(agmntDetails.submissionDate).format('MM/DD/YYYY') : ''
        let currentDate = moment(new Date()).format('MM/DD/YYYY')
        if (timezone) {
            submissionDate = agmntDetails.submissionDate ? moment(agmntDetails.submissionDate).tz(timezone).format('MM/DD/YYYY') : ''
            currentDate = moment(new Date()).tz(timezone).format('MM/DD/YYYY')
        }
        const textData = {
            dateOfAgreement: submissionDate,
            arrangerName: '',
            agreementLocationAddressLine1: location ? location.name : '',
            agreementLocationAddressLine2: locAddress ? _.compact([locAddress.line1, locAddress.line2, locAddress.city, locAddress.state, locAddress.zipcode]).join(', ').trim() : '',
            notLaterThanMidNightOf: '',
            dateOfCancellation: currentDate,
            agreementContractNumber: agmntDetails && agmntDetails.agreement ? agmntDetails.agreement.contractNumber : ''
        }
        return this.convertToTextTabsLatest(arranger, textData)
    }

    purchaserPreFillData () {
        const purchaser = this.getSignerByRole(
            ROLES.Purchaser, this.formId
        )
        const textData = {}
        return this.convertToTextTabsLatest(purchaser, textData)
    }
}

module.exports = PreNeedTrustNoticeOfCancellation
