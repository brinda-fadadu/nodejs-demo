const moment = require('moment')
const BaseForm = require('./baseForm')
const models = require('../../../models')
const { formatPhoneNumber } = require('../../../utils/formatters')
const ROLES = {
    funeralDirector: 'Funeral Director',
    Purchaser: 'Purchaser',
    funeralHomeManager: 'Funeral Home Manager'

}

class PreNeedTruestAgreementForm extends BaseForm {
    constructor ({ caseInfoFormId, formId }, person) {
        super({ caseInfoFormId })
        if (person) {
            this.person = person
        }
        this.formId = formId
    }

    async envelopeData () {
        return [
            await this.funeralDirectorPreFillData(),
            await this.purchaserPreFillData(),
            await this.funeralHomeManagerPreFillData()
        ]
    }

    async fetchPNStmtDetails (personId, agreementId) {
        let whereCondition = {
            type: 1,
            needType: 2
        }
        if (agreementId) {
            whereCondition = {
                id: agreementId
            }
        }
        try {
            const result = await models.AgreementPerson.findOne({
                where: {
                    personId,
                    deletedBy: null,
                    deletedAt: null
                },
                include: [{
                    model: models.Agreement,
                    where: whereCondition,
                    include: [{
                        model: models.Employee,
                        as: 'arranger'
                    }, {
                        model: models.Location,
                        as: 'location'
                    },
                    {
                        model: models.AgreementFinance,
                        as: 'financeDetails',
                        required: false,
                        where: {
                            isActive: true
                        },
                        include: [{
                            model: models.AgreementFinanceSchedule,
                            as: 'agreementFinanceSchedule',
                            required: false
                        }]
                    }]
                },
                {
                    model: models.AgreementRole,
                    as: 'agreementRole',
                    where: {
                        name: 'Beneficiary'
                    }
                }]
            })
            return result
        } catch (err) {
            throw err
        }
    }
    async funeralDirectorPreFillReuseData (purchaser, agreementId) {
        const pnstmtData = await this.fetchPNStmtDetails(this.person.id, agreementId)
        const stmtFinaceData = pnstmtData ? (pnstmtData.Agreement ? ((pnstmtData.Agreement.financeDetails && pnstmtData.Agreement.financeDetails.length) ? pnstmtData.Agreement.financeDetails[0].agreementFinanceSchedule
            : null)
            : null)
            : null
        let firstSchedule, lastSchedule
        if (stmtFinaceData && stmtFinaceData.length) {
            [firstSchedule, lastSchedule] = [stmtFinaceData[0], stmtFinaceData[stmtFinaceData.length - 1]]
        }
        purchaser = purchaser && purchaser.agreementPerson ? purchaser.agreementPerson.person : ''
        const purchaserAddress = purchaser ? (purchaser.addressPlace ? (purchaser.addressPlace.address ? purchaser.addressPlace.address : null) : null) : null
        const personAddress = this.person.addressPlace ? this.person.addressPlace.address ? this.person.addressPlace.address : '' : ''

        const data = {
            FuneralCaseId: pnstmtData ? (pnstmtData.Agreement ? pnstmtData.Agreement.contractNumber : '') : '',
            FuneralAssignedTo: pnstmtData ? (pnstmtData.Agreement ? (pnstmtData.Agreement.arranger ? pnstmtData.Agreement.arranger.name : '') : '') : '',
            BeneficiaryFirstName: this.person.firstName,
            BeneficiaryMiddleInitial: this.person.middleName,
            BeneficiaryLastName: this.person.lastName,
            BeneficiaryDOB: this.person.dateOfBirth ? moment(this.person.dateOfBirth).format('MM/DD/YYYY') : '',
            BeneficiaryAddress: personAddress ? `${personAddress.line1 || ''} ${personAddress.line2 || ''}` : '',
            BeneficiaryCity: personAddress ? personAddress.city : '',
            BeneficiaryState: personAddress ? (personAddress.state ? await this.getState(personAddress.state) : '') : '',
            BeneficiaryZipCode: personAddress ? personAddress.zipcode : '',
            BeneficiaryPhoneNumber: formatPhoneNumber(this.person.phoneNumber) || '',
            BeneficiaryEmailAddress: this.person.email || '',
            PurchaserFirstName: purchaser ? purchaser.firstName : '',
            PurchaserMiddleInitial: purchaser ? purchaser.middleName : '',
            PurchaserLastName: purchaser ? purchaser.lastName : '',
            PurchaserDOB: purchaser.dateOfBirth ? moment(purchaser.dateOfBirth).format('MM/DD/YYYY') : '',
            PurchaserAddress: purchaserAddress ? `${purchaserAddress.line1 || ''} ${purchaserAddress.line2 || ''}` : '',
            PurchaserCity: purchaserAddress ? purchaserAddress.city : '',
            PurchaserState: purchaserAddress ? (purchaserAddress.state ? await this.getState(purchaserAddress.state) : '') : '',
            PurchaserZipCode: purchaserAddress ? purchaserAddress.zipcode : '',
            PurchaserPhoneNumber: purchaser ? formatPhoneNumber(purchaser.phoneNumber) : '',
            PurchaserEmailAddress: purchaser ? purchaser.email : '',
            FuneralTrustTotal: pnstmtData ? this.getPrice(pnstmtData.Agreement.totalCashPrice) : '0.00', // format needs to be checked.
            FuneralTrustDeposit: pnstmtData ? this.getPrice(pnstmtData.Agreement.totalPaid) : '0.00', // format needs to be checked.
            FuneralTrustBalance: pnstmtData ? this.getPrice(pnstmtData.Agreement.due) : '0.00', // format needs to be checked.
            TotalNumberPayments: '',
            FirstPaymentDate: firstSchedule ? moment(firstSchedule.expectedPaymentDate).format('MM/DD/YYYY') : '',
            MonthlyPaymentAmount: firstSchedule ? this.getPrice(firstSchedule.expectedPaymentAmount) : '', // format of expectedPaymentAmount needs to be checked.
            FinalPaymentAmount: lastSchedule ? this.getPrice(lastSchedule.expectedPaymentAmount) : '', // format of expectedPaymentAmount needs to be checked.
            FinalPaymentDueDate: lastSchedule ? moment(lastSchedule.expectedPaymentDate).format('MM/DD/YYYY') : ''
        }

        const checkBoxData = {
            ACCS: pnstmtData ? (pnstmtData.Agreement ? (pnstmtData.Agreement.location.code === 'ACC') : false) : false,
            CFS: pnstmtData ? (pnstmtData.Agreement ? (pnstmtData.Agreement.location.code === 'CFS') : false) : false,
            CNG: pnstmtData ? (pnstmtData.Agreement ? (pnstmtData.Agreement.location.code === 'CNG') : false) : false,
            MDC: pnstmtData ? (pnstmtData.Agreement ? (pnstmtData.Agreement.location.code === 'MDC') : false) : false,
            SSO: pnstmtData ? (pnstmtData.Agreement ? (pnstmtData.Agreement.location.code === 'SSO') : false) : false,
            SinglePaymentPlan: pnstmtData ? (pnstmtData.Agreement ? pnstmtData.Agreement.due === 0 : false) : false,
            MonthlyPaymentPlan: pnstmtData ? (pnstmtData.Agreement ? !!pnstmtData.Agreement.financeDetails : false) : false,
            MonthlyCheck: '',
            APD: '',
            ACH: '',
            '5th': '',
            '15th': ''
        }
        return { data, checkBoxData }
    }
    async funeralDirectorPreFillData () {
        const funeralDirector = this.getSignerByRole(ROLES.funeralDirector, this.formId)
        const purchaser = this.getSignerByRole(ROLES.Purchaser, this.formId)
        const { data, checkBoxData } = await this.funeralDirectorPreFillReuseData(purchaser)
        return this.convertToTextTabsLatest(funeralDirector, data, checkBoxData)
    }
    async purchaserPreFillReuseData (purchaserData) {
        const purchaser = purchaserData.agreementPerson ? purchaserData.agreementPerson.person : ''
        const purchaserAddress = purchaser ? (purchaser.addressPlace ? (purchaser.addressPlace.address ? purchaser.addressPlace.address : null) : null) : null
        const data = {
            PurchaserFullName: purchaser ? [purchaser.firstName, purchaser.middleName, purchaser.lastName].join(' ').trim() : '',
            PurchaserAddress: purchaserAddress ? `${purchaserAddress.line1 || ''} ${purchaserAddress.line2 || ''}` : '',
            PurchaserCity: purchaserAddress ? purchaserAddress.city : '',
            PurchaserState: purchaserAddress ? (purchaserAddress.state ? await this.getState(purchaserAddress.state) : '') : '',
            PurchaserZipCode: purchaserAddress ? purchaserAddress.zipcode : '',
            PurchaserPhone: purchaser ? formatPhoneNumber(purchaser.phoneNumber) : '',
            PurchaserEmail: purchaser ? purchaser.email : '',
            RelationshipToBeneficiary: purchaserData ? (purchaserData.agreementPerson.relation ? purchaserData.agreementPerson.relation.name : '') : ''
        }
        return { data }
    }
    async purchaserPreFillData () {
        const purchaserData = this.getSignerByRole(ROLES.Purchaser, this.formId)
        const { data } = await this.purchaserPreFillReuseData(purchaserData)
        return this.convertToTextTabsLatest(purchaserData, data)
    }
    async funeralHomeManagerPreFillReuseData () {
        const data = {
            DD: `${moment().format('D')}`,
            MM: `${moment().format('MMM')}`,
            YY: `${moment().format('YY')}`
        }
        return { data }
    }
    async funeralHomeManagerPreFillData () {
        const funeralHomeManager = this.getSignerByRole(ROLES.funeralHomeManager, this.formId)
        const { data } = await this.funeralHomeManagerPreFillReuseData()
        return this.convertToTextTabsLatest(funeralHomeManager, data)
    }
}

module.exports = PreNeedTruestAgreementForm
