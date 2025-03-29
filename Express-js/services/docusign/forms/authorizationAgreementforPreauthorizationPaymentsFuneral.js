const BaseForm = require('./baseForm')
const models = require('../../../models')
const _ = require('lodash')
const moment = require('moment')
const ROLES = {
    arranger: 'Arranger',
    Payor: 'Payor',
    CoPayor: 'Co-Payor'

}

class AuthorizationAgreementforPreauthorizedPaymentsFuneral extends BaseForm {
    constructor ({ caseInfoFormId, formId }, caseInfoForm) {
        super({ caseInfoFormId })
        if (caseInfoForm) {
            this.caseInfoForm = caseInfoForm
        }
        this.formId = formId
    }

    async envelopeData () {
        return [
            await this.arrangerPrefillData(),
            this.payorPreFillData(),
            this.coPayorPreFillData()
        ]
    }
    async arrangerPrefillReuseData (agreementId) {
        // let metaData = this.caseInfoForm.metaData ? JSON.parse(this.caseInfoForm.metaData.replace(/'/g, '"')) : ''
        let metaData = this.caseInfoForm.metaData ? JSON.parse(this.caseInfoForm.metaData) : ''
        let timezone = metaData.timezone ? metaData.timezone : null
        const agmntDetails = await this.getAgreementLocation(agreementId)
        const [finDetails] = agmntDetails ? agmntDetails.financeDetails : []
        const finSchedule = finDetails ? finDetails.agreementFinanceSchedule : null
        const firstSchedule = finSchedule ? finSchedule.find(fs => fs.paymentIndex === 1) : null
        const firstInstallmentDate = firstSchedule ? firstSchedule.expectedPaymentDate : null
        const textData = {
            statementNumber: agmntDetails && agmntDetails.contractNumber ? agmntDetails.contractNumber : null,
            firstInstallmentDate: firstInstallmentDate ? moment(firstInstallmentDate).tz(timezone).format('MM-DD-YYYY') : ''
        }
        return { textData }
    }
    async arrangerPrefillData () {
        const arranger = this.getSignerByRole(ROLES.arranger, this.formId)
        const { textData } = await this.arrangerPrefillReuseData()
        return this.convertToTextTabsLatest(arranger, textData)
    }
    payorPreFillReuseData (payor, coPayor) {
        const textData = {
            cardholderName: '',
            cardNumber: '',
            securityCode: '',
            expiryDate: '',
            billingAddressline1line2: '',
            billingadresscityAndState: '',
            billingaddressZip: '',
            checkingRoutingNumber: '',
            savingsRoutingNumber: '',
            checkingAccountNumber: '',
            savingsAccountNumber: '',
            checkingDepositoryName: '',
            savingsDepositoryName: '',
            checkingBranch: '',
            savingsBranch: '',
            checkingBranchAddress: '',
            savingsBranchAddress: '',
            payorCopayerNames: _.get(coPayor, 'agreementPerson.person') ? this.personFullName(_.get(payor, 'agreementPerson.person')) + ',' + this.personFullName(_.get(coPayor, 'agreementPerson.person')) : this.personFullName(_.get(payor, 'agreementPerson.person')),
            relationShip: ''
        }
        return { textData }
    }
    payorPreFillData () {
        const payor = this.getSignerByRole(ROLES.Payor, this.formId)
        const coPayor = this.getSignerByRole(ROLES.CoPayor, this.formId)
        const { textData } = this.payorPreFillReuseData(payor, coPayor)
        return this.convertToTextTabsLatest(payor, textData)
    }

    coPayorPreFillData () {
        const coPayor = this.getSignerByRole(ROLES.CoPayor, this.formId)
        return this.convertToTextTabsLatest(coPayor, {})
    }

    personFullName (person) {
        return [person.firstName, person.middleName, person.lastName]
            .join(' ')
            .trim()
    }
    async getAgreementLocation (agreementId) {
        let whereCondition = {
            id: this.caseInfoForm.agreementId,
            type: 1,
            needType: 2
        }
        if (agreementId) {
            whereCondition = {
                id: agreementId
            }
        }
        const agmntDetails = await models.Agreement.findOne({
            where: whereCondition,
            include: [
                {
                    model: models.Location,
                    as: 'location',
                    required: true
                },
                {
                    model: models.AgreementFinance.scope('withFinanceSchedule'),
                    as: 'financeDetails',
                    required: false,
                    where: {
                        isActive: true
                    }
                }
            ]
        })
        return agmntDetails
    }
}
module.exports = AuthorizationAgreementforPreauthorizedPaymentsFuneral
