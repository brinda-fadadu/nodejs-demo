const router = require('express').Router()
const authentication = require('../../middleware/authentication')
const {
    createPaymentHandler,
    listPaymentsByStatement,
    sendPaymentRequestEmail,
    stripeWebhookHandler,
    getCartDetails,
    voidPayment,
    downloadPaymentReceiptHandler,
    refreshPayment
} = require('./paymentsHandler')
const {
    listPayerCards,
    addCardForAPayor,
    deleteCardOfPayor,
    cardPaymentHandler
} = require('./cardPaymentsHandler')
const {
    manualPaymentsValidation,
    queryParamsValidation,
    voidPaymentValidation,
    downloadPaymentReceiptValidation
} = require('../../lib/validations/payments/manualPayments')
const {
    emailPaymentValidation
} = require('../../lib/validations/payments/emailPayment')
const {
    sendEmailPaymentRequest
} = require('./emailPaymentHandler')
const { addAnticipatedPayment, getAnticipatedPayments, addReceiveAmount } = require('./anticipatedPaymentHandler')

const { addingCardValidation, listingCardsValidation, deleteCardValidation, cardPaymentsValidation } = require('../../lib/validations/payments/cardPayments')
const { anticipatedPaymentValidation, getAnticipatedPaymentValidation, receiveAmountValidation } = require('../../lib/validations/payments/anticipatedPayment')
const cashReportValidation = require('../../lib/validations/cashReportValidations')
const cashReportList = require('./cashreport')
router.post('/webhook', stripeWebhookHandler)

router.use(authentication)
router.post('/', manualPaymentsValidation, createPaymentHandler)
router.get('/', queryParamsValidation, listPaymentsByStatement)
router.get('/amountDetails', queryParamsValidation, getCartDetails)
router.put('/:paymentId/voidPayment', voidPaymentValidation, voidPayment)
router.get('/:paymentId/download-receipt', downloadPaymentReceiptValidation, downloadPaymentReceiptHandler)
router.put('/:paymentId/refreshPayment', refreshPayment)

// Card payment and email(link) payments
router.post('/stripe', cardPaymentsValidation, cardPaymentHandler)
router.post('/stripe/:payorId/cards', addingCardValidation, addCardForAPayor)
router.get('/stripe/:payorId/cards', listingCardsValidation, listPayerCards)
router.delete('/stripe/:payorId/cards/:cardId', deleteCardValidation, deleteCardOfPayor)
router.post('/stripe/email', emailPaymentValidation, sendEmailPaymentRequest)

// Digital Payment
router.post('/agreement/:agreementId/payer/:payerId/payment-request-email', emailPaymentValidation, sendPaymentRequestEmail)

// Anticipated Payment
router.post('/anticipated', anticipatedPaymentValidation, addAnticipatedPayment)
router.get('/anticipated', getAnticipatedPaymentValidation, getAnticipatedPayments)
router.post('/anticipated/receivePayment', receiveAmountValidation, addReceiveAmount)

// cash report
router.get('/cash-receipt-report', cashReportValidation, cashReportList.listPaymentReceipt)
router.get('/cash-receipt-report/export', cashReportList.exportPaymentReceipt)
module.exports = router
