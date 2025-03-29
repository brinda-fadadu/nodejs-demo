const moment = require('moment')
const BaseForm = require('./baseForm')
const _ = require('lodash')
const models = require('../../../models')
const { getKey } = require('../../../lib/util')
const { seed } = require('../../../config/seed')
const PayorController = require('../../../controllers/refactorControllers/paymentController/payerController')

const ROLES = {
    'purchaser': 'Purchaser',
    'coPurchaser': 'Co-Purchaser',
    'salesCounselor': 'Sales Counselor'
}

class XXSplitDepositForm extends BaseForm {
    constructor ({ caseInfoFormId, formId }) {
        super({ caseInfoFormId })
        this.formId = formId
    }

    async envelopeData () {
        return [
            await this.purchaserPrefillData(),
            this.coPurchaserPrefillData(),
            this.salesCounselorPrefillData()
        ]
    }

    async purchaserPrefillData () {
        const owner = this.getSignerByRole(ROLES.purchaser, this.formId)
        const agreementData = await this.getAgreementData()
        const agmntDetails = await this.getAgreementPropertyLocation()
        const agmntLocation = _.get(agmntDetails, 'agreementProperties[0].property.propertyGardens.propertyCampus.name')
        let dueDate
        if (agreementData && agreementData.financeDetails && agreementData.financeDetails.length) {
            let [finDetails] = agreementData.financeDetails
            let finSchedule = finDetails.agreementFinanceSchedule
            let finSchedulelnth = finDetails.agreementFinanceSchedule.length
            let lastSchedule
            if (finSchedulelnth) {
                lastSchedule = finSchedule[finSchedulelnth - 1]
            }
            dueDate = lastSchedule ? lastSchedule.expectedPaymentDate : null
        }
        const [payment1, payment2] = await this.getPayments()
        // let metaData = this.caseInfoForm.metaData ? JSON.parse(this.caseInfoForm.metaData.replace(/'/g, '"')) : ''
        let metaData = this.caseInfoForm.metaData ? JSON.parse(this.caseInfoForm.metaData) : ''

        let timezone = metaData.timezone ? metaData.timezone : null
        const cashMode = Number(getKey(seed.PaymentTypes, 'Cash'))
        const cardMode = Number(getKey(seed.PaymentTypes, 'Card'))
        const checkMode = Number(getKey(seed.PaymentTypes, 'Check'))
        let p1Card, p2Card
        if (payment1 && payment1.paymentType === cardMode) {
            const payorController = new PayorController(payment1.payorId)
            payorController.setResource(payment1.resourceId)
            const cardsRes = await payorController.listPayorCards()
            p1Card = cardsRes && cardsRes.length ? cardsRes.find(e => e.id === payment1.cardId) : null
        }
        if (payment2 && payment2.paymentType === cardMode) {
            const payorController = new PayorController(payment2.payorId)
            payorController.setResource(payment2.resourceId)
            const cardsRes = await payorController.listPayorCards()
            p2Card = cardsRes && cardsRes.length ? cardsRes.find(e => e.id === payment2.cardId) : null
        }
        const checkBoxData = {
            CLMemorialPark: !(agmntDetails && agmntLocation === 'Olivet campus'),
            CLOlivetCampus: !!(agmntDetails && agmntLocation === 'Olivet campus'),
            cash: !!(payment1 && payment1.paymentType === cashMode),
            creditCard: !!(payment1 && payment1.paymentType === cardMode),
            check: !!(payment1 && payment1.paymentType === checkMode),
            visa: !!(p1Card && p1Card.brand === 'Visa'),
            master: !!(p1Card && p1Card.brand === 'MasterCard'),
            amex: !!(p1Card && p1Card.brand === 'American Express'),
            discover: !!(p1Card && p1Card.brand === 'Discover'),
            secondPaymentCash: !!(payment2 && payment2.paymentType === cashMode),
            secondPaymentCreditCard: !!(payment2 && payment2.paymentType === cardMode),
            secondPaymentCheck: !!(payment2 && payment2.paymentType === checkMode),
            visa1: !!(p2Card && p2Card.brand === 'Visa'),
            master1: !!(p2Card && p2Card.brand === 'MasterCard'),
            amex1: !!(p2Card && p2Card.brand === 'American Express'),
            discover1: !!(p2Card && p2Card.brand === 'Discover')
        }
        const p1 = payment1 ? payment1.AgreementPerson.person : null
        const p1Adrs = p1 && p1.addressPlace && p1.addressPlace.address ? p1.addressPlace.address : null
        const p2 = payment2 ? payment2.AgreementPerson.person : null
        const p2Adrs = p2 && p2.addressPlace && p2.addressPlace.address ? p2.addressPlace.address : null
        const textData = {
            contractNumber: _.get(agreementData, 'contractNumber', ''),
            contractNumberAA: _.get(agreementData, 'contractNumber', ''),
            receivedDay: payment1 ? moment(payment1.createdAt).tz(timezone).format('DD') : '',
            receivedMonth: payment1 ? moment(payment1.createdAt).tz(timezone).format('MM') : '',
            receivedYear: payment1 ? moment(payment1.createdAt).tz(timezone).format('YY') : '',
            totalDue: this.getPrice(_.get(agreementData, 'due', '')),
            depositedAmount: payment1 ? this.getPrice(payment1.amount) : '',
            receiptNumber: payment1 ? payment1.receiptNumber : '',
            creditCardNumber: p1Card ? p1Card.last4 : '',
            nameOnCard: p1Card && p1Card.name ? p1Card.name : p1 && p1Card ? [p1.firstName, p1.middleName, p1.lastName].join(' ').trim() : '',
            ccExipiryDate: p1Card ? `${p1Card.exp_month}/${p1Card.exp_year}` : '',
            ccSecurityCode: '',
            ccHolderAddress: p1Adrs ? `${p1Adrs.line1 || ''}, ${p1Adrs.line2 || ''}` : '',
            ccHolderAddressCity: p1Adrs ? p1Adrs.city : '',
            ccHolderAddressState: p1Adrs ? await this.getState(p1Adrs.state) : '',
            ccHolderAddressZip: p1Adrs ? p1Adrs.zipcode : '',
            secondPaymentReceivedDay: payment2 ? moment(payment2.createdAt).tz(timezone).format('DD') : '',
            secondPaymentReceivedMonth: payment2 ? moment(payment2.createdAt).tz(timezone).format('MM') : '',
            secondPaymentReceivedYear: payment2 ? moment(payment2.createdAt).tz(timezone).format('YY') : '',
            secondPaymentReceivedAmount: payment2 ? this.getPrice(payment2.amount) : '',
            secondPaymentReceiptNumber: payment2 ? payment2.receiptNumber : '',
            secondPaymentCreditCardNumber: p2Card ? p2Card.last4 : '',
            secondPaymentCreditCardHolderName: p2Card && p2Card.name ? p2Card.name : p2 && p2Card ? [p2.firstName, p2.middleName, p2.lastName].join(' ').trim() : '',
            secondPaymentCreditCardExpiryDate: p2Card ? p2Card.exp_month : '',
            secondPaymentCreditCardSecurityCode: '',
            secondPaymentCcHolderAddress: p2Adrs ? `${p2Adrs.line1 || ''}, ${p2Adrs.line2 || ''}` : '',
            secondPaymentCcHolderAddressCity: p2Adrs ? p2Adrs.city : '',
            secondPaymentCcHolderAddressState: p2Adrs ? await this.getState(p2Adrs.state) : '',
            secondPaymentCcHolderAddressZip: p2Adrs ? p2Adrs.zipcode : '',
            paymentDueDate: dueDate ? moment(dueDate).tz(timezone).format('MM-DD-YYYY') : '',
            signedDay: moment().tz(timezone).format('DD'),
            signedMonth: moment().tz(timezone).format('MM'),
            signedYear: moment().tz(timezone).format('YY')
        }
        return this.convertToTextTabsLatest(owner, textData, checkBoxData)
    }

    coPurchaserPrefillData () {
        const coPurchaser = this.getSignerByRole(ROLES.coPurchaser, this.formId)
        return this.convertToTextTabsLatest(coPurchaser, {})
    }

    salesCounselorPrefillData () {
        const salesCounselor = this.getSignerByRole(ROLES.salesCounselor, this.formId)
        return this.convertToTextTabsLatest(salesCounselor, {})
    }

    getAgreementData () {
        return models.Agreement.findOne({
            where: { id: this.caseInfoForm.agreementId },
            include: [
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
    }

    async getPayments () {
        const payments = await models.Payment.findAll({
            where: {
                resourceId: this.caseInfoForm.agreementId,
                resourceType: 'Agreement'
            },
            include: [
                {
                    model: models.AgreementPerson,
                    required: true,
                    include: [
                        {
                            model: models.Person.scope('withPlace'),
                            as: 'person',
                            required: true
                        }
                    ]
                }
            ],
            order: [['createdAt', 'ASC']]
        })
        return payments
    }
}
module.exports = XXSplitDepositForm
