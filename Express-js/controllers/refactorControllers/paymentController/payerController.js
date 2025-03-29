const PaymentController = require('./paymentController')
// const ApprovalController = require('../adjustmentController/approvalsController')
const models = require('../../../models')
const util = require('../../../lib/util')
const PersonController = require('./../personController/personController')
const moment = require('moment')
const { stripeClient } = require('../../../services').stripe
const { PaymentTypes } = require('../../../config/seed').seed
const _ = require('lodash')
const logger = require('../../../lib/logger')
const Email = require('../../../lib/Emailer/core')
const PartnerController = require('../adminController/partnerController')
const ReservationController = require('../agreementController/propertyReservationTypeController')
const { upsert, commonDownloadFileWithSignature } = require('../utils')
var rollbar = require('../../../lib/rollbar')
const Op = require('sequelize').Op
const db = require('../../../models/index')
const { convertToJsonRecursive } = require('../utils')

class PayorController {
    /**
   *  make payment with cash
   */
    constructor (payorId) {
        this.payorId = payorId
    }

    setResource (resourceId) {
        this.resourceId = resourceId
    }

    // finding the payor
    async findPayor (transaction) {
        const condition = {
            id: this.payorId
        }
        if (this.resourceId) {
            condition['agreementId'] = this.resourceId
        }
        try {
            let payor = await models.AgreementPerson.findOne({
                where: condition,
                transaction
            })
            if (!payor) {
                throw new Error('PERSON_NOT_FOUND')
            } else {
                const personController = new PersonController(payor.personId)
                payor = await personController.getDetails(transaction)
                this.payor = payor
                return payor
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    async _findPartnerPayor (transaction) {
        const agreementPartner = await models.AgreementPartner.scope('withPartnerDetails').findOne({
            where: {
                agreementId: this.resourceId
            },
            transaction
        })
        agreementPartner.partner.email = agreementPartner.partner.contact.email
        this.payor = agreementPartner.partner
        return agreementPartner.partner
    }

    async findPerson (transaction) {
        try {
            const personController = new PersonController(this.payorId)
            const payor = await personController.getDetails(transaction)
            if (!payor) {
                throw new Error('PERSON_NOT_FOUND')
            } else {
                this.payor = payor
                return payor
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    // fetching the agreement
    async loadResource (transaction) {
        try {
            const AddendumController = require('../agreementController/addendum')
            const options = {}
            if (transaction) {
                options.transaction = transaction
            }
            const agreement = await models.Agreement.findOne({
                where: {
                    id: this.resourceId
                },
                ...options
            }, transaction)
            if (!agreement) {
                throw new Error('AGREEMENT_NOT_FOUND')
            } else {
                const addendumController = new AddendumController(this.resourceId)
                const activeAddendum = await addendumController.getInProgressAddendum(transaction)
                this.addendumId = _.get(activeAddendum, 'id', null)
                return agreement
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
    /**
 *
   * @param {Object<{amount: Number, receiptNumber: String, payorId: Number, paymentType: Number, status: String }>} reqBody
 */
    async createCashPayment (reqBody) {
        logger.info(`Cash Payment have started for Resource Type: ${reqBody.resourceType ? reqBody.resourceType : ''} Resource id: ${reqBody.resourceId ? reqBody.resourceId : ''}`)
        const AgreementController = require('./../agreementController/agreementController')
        const FinanceController = require('./../financeController/financeOptionController')
        const transaction = await models.sequelize.transaction()
        try {
            rollbar.log('cash_payments', reqBody)
            let payor
            const userId = reqBody.receivedBy
            // find if the payor and statement exists
            const agreement = await this.loadResource(transaction)
            // check if the amount is less than or equal to balance
            const agreementController = new AgreementController(this.resourceId)
            const paymentDetails = await agreementController.getPaymentCalculations(transaction)

            if (agreement.type === AgreementController.TYPES['Wholesale Cremation']) {
                payor = await this._findPartnerPayor(transaction)
                reqBody.partnerId = reqBody.payorId
                reqBody.payorId = null
            } else {
                payor = await this.findPayor(transaction)
                reqBody.partnerId = null
            }
            // Get the remaining due for validating the amount entered
            const balanceAmount = await this.getRemainingDue(this.resourceId, paymentDetails.balance, transaction)
            if (Number(reqBody.amount) > Number(balanceAmount)) {
                throw new Error('AMOUNT_CAN_NOT_BE_GREATER_THAN_BALANCE_AMOUNT')
            }

            if (paymentDetails) {
                const receiptNumber = await PaymentController.getArrangementTypeAndCreateReceiptNo(
                    this.resourceId,
                    transaction
                )
                reqBody.receiptNumber = receiptNumber
                reqBody.status = 'success'
                reqBody.addendumId = this.addendumId
                const payment = await AgreementController.addPayment(reqBody, transaction)
                rollbar.info(`Cash Payment Created`, payment)
                // Recording the payment in finance if there is an active financing
                const financeController = new FinanceController(this.resourceId)
                await financeController.addPaymentToSchedule(payment, reqBody.amount, transaction)
                // finance functionality ends here
                let paymentRes = payment.toJSON()
                const agreementController = new AgreementController(this.resourceId)
                let paymentCalculations = await agreementController.getPaymentCalculations(transaction)
                paymentRes.totalAmount = paymentCalculations.totalAmount
                paymentRes.totalPaid = paymentCalculations.totalPaid
                paymentRes.balance = paymentCalculations.balance
                paymentRes.payorEmail = payor.email
                await models.Agreement.updateTotalPaidAndDue(this.resourceId, userId, transaction)
                await transaction.commit()
                logger.info(`Cash Payment have been completed for Resource Type: ${reqBody.resourceType ? reqBody.resourceType : ''} Resource Id: ${reqBody.resourceId ? reqBody.resourceId : ''} Payment id: ${paymentRes.id ? paymentRes.id : ''}`)
                const dataToSend = {
                    resourceId: this.resourceId,
                    receiptNumber: receiptNumber,
                    paymentId: paymentRes.id
                }
                const { queueNames, queues } = require('../../../appQueues')
                const duplicateRecipJob = queues[queueNames.duplicateReceiptJob]
                duplicateRecipJob.add('duplicateReceiptJob', dataToSend)
                // updating the reservation type
                // committing the transaction before,
                // because there is a new transaction running in updateReservationTypeOnPayment
                const reservationController = new ReservationController(this.resourceId)
                await reservationController.updateReservationTypeOnPayment()
                if (agreement.type === AgreementController.TYPES['Wholesale Cremation']) {
                    paymentRes.partnerId = reqBody.payorId
                    paymentRes.payorId = null
                }
                return paymentRes
            }
        } catch (error) {
            await transaction.rollback()
            rollbar.error(`cash_payment_error:`, error, reqBody)
            logger.info(`Cash Payment Transaction Deadlock for Resource Type: ${reqBody.resourceType ? reqBody.resourceType : ''} Resource Id: ${reqBody.resourceId ? reqBody.resourceId : ''} at ${JSON.stringify(error)}`)
            throw error
        }
    }

    // fetching the list of payments made for the agreement
    async getListPayments (status) {
        const transaction = await models.sequelize.transaction()
        try {
            // FYI: this function is for fetching all payments irrespective of resourceType
            // TODO: In future, if new module comes and if we need to integrate payment module for that new module, need to include afterFind hook in payment model.
            const AgreementController = require('./../agreementController/agreementController')
            const agreement = await this.loadResource(transaction)
            const whereCondition = {
                resourceId: this.resourceId
            }
            if (status) {
                whereCondition['status'] = status
            }
            if (this.payorId) {
                if (agreement.type === AgreementController.TYPES['Wholesale Cremation']) {
                    await this._findPartnerPayor(transaction)
                    whereCondition.partnerId = this.payorId
                } else {
                    whereCondition.payorId = this.payorId
                }
            }
            const includeOptions = [
                {
                    model: models.User,
                    attributes: [['Name', 'name']]
                },
                {
                    model: models.AgreementPerson,
                    include: [
                        {
                            model: models.Person,
                            as: 'person',
                            attributes: ['firstName', 'middleName', 'lastName'],
                            required: true
                        }
                    ],
                    required: false
                }, {
                    model: models.File,
                    as: 'paymentFileUrl',
                    where: { resourceName: 'Payment' },
                    required: false
                },
                {
                    model: models.AnticipatedPayment,
                    as: 'anticipatedPayment',
                    include: [
                        {
                            model: models.Organization,
                            as: 'organization',
                            required: false
                        }
                    ],
                    required: false
                }
            ]
            let result = await models.Payment.findAll({
                where: whereCondition,
                include: includeOptions,
                order: [['createdAt', 'DESC']],
                transaction: transaction
            })
            // result = JSON.parse(JSON.stringify(result))
            let formatedResult = await Promise.all(result.map(async ele => {
                let otherInfo = ele.otherInfo ? JSON.parse(ele.otherInfo) : {}
                ele.paymentFileUrl = ele.paymentFileUrl ? ele.paymentFileUrl.toJSON() : {}
                const payor = ele.AgreementPerson ? ele.AgreementPerson.person : ele.Person ? ele.Person : null
                if ((ele.paymentFileUrl && ele.paymentFileUrl.originalFileName) || ele.fileUrl) {
                    const signedFileUrl = { ...ele.paymentFileUrl, documentUrl: await commonDownloadFileWithSignature(ele.paymentFileUrl, ele.fileUrl) }
                    ele.fileUrl = signedFileUrl
                }
                return {
                    id: ele.id,
                    amount: ele.amount,
                    paymentType: ele.paymentType,
                    referenceNumber: ele.referenceNumber,
                    cashReceiptId: ele.cashReceiptId,
                    receiptNumber: ele.receiptNumber,
                    receivedBy: {
                        id: ele.User && ele.User.id,
                        name: ele.User && ele.User.name
                    },
                    payorId: ele.payorId,
                    payor: payor,
                    createdAt: ele.createdAt,
                    otherInfo: {
                        cardType: otherInfo.cardType ? otherInfo.cardType : null,
                        lastDigits: otherInfo.lastDigits ? otherInfo.lastDigits : null,
                        brand: otherInfo.brand ? otherInfo.brand : null,
                        billingAddress: otherInfo.billingAddress
                            ? otherInfo.billingAddress
                            : null
                    },
                    fileUrl: ele.fileUrl ? ele.fileUrl : null,
                    status: ele.status,
                    voidType: ele.voidType,
                    voidedRemarks: ele.voidedRemarks,
                    voidedTime: ele.voidedTime,
                    anticipatedPayment: ele.anticipatedPayment,
                    webHookEventId: ele.webHookEventId
                    // paidOrganization: ele.Organization ? ele.Organization.name : null
                }
            }))
            await transaction.commit()
            return formatedResult
        } catch (err) {
            await transaction.rollback()
            logger.error(err)
            throw err
        }
    }

    // creates stripeid for a person
    async createStripeCustomer (isPayorPartner, transaction) {
        try {
            const customer = await stripeClient.createCustomer(this.payor)
            this.payor.stripeCustomerId = customer.id
            if (isPayorPartner) {
                const partnerController = new PartnerController(this.payor.id)
                await partnerController.updatePartner(this.payor, transaction)
            } else {
                await PersonController.createOrUpdate(this.payor, undefined, undefined, transaction)
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
    /**
     *
     * @param {Object<{amount: Number}>} data
     */
    async sendPaymentRequestEmail (data) {
        const AgreementController = require('./../agreementController/agreementController')
        const transaction = await models.sequelize.transaction()
        try {
            rollbar.log('email_payments', data)
            const agreement = await this.loadResource(transaction)
            if (agreement.type === AgreementController.TYPES['Wholesale Cremation']) {
                await this._findPartnerPayor(transaction)
                data.partnerId = data.payorId
                data.payorId = null
            } else {
                await this.findPayor(transaction)
                data.partnerId = null
            }
            if (!this.payor.stripeCustomerId) {
                await this.createStripeCustomer(transaction)
            }
            let addendumId = null
            let contractNumber = agreement.contractNumber
            if (this.addendumId) {
                addendumId = this.addendumId
                const addendumDetails = await models.Addendum.findOne({ where: { id: addendumId } })
                contractNumber = addendumDetails.addendumNumber
            }
            // const receiptNumber = await PaymentController.getArrangementTypeAndCreateReceiptNo(
            //     this.resourceId,
            //     transaction
            // )
            const paymentType = Object.keys(PaymentTypes).find(e => PaymentTypes[e] === 'Email Request')
            const paymentCreationResult = await models.Payment.create(
                {
                    // receiptNumber: receiptNumber,
                    resourceId: this.resourceId,
                    addendumId: addendumId,
                    resourceType: 'Agreement',
                    payorId: data.payorId,
                    amount: data.amount,
                    partnerId: data.partnerId,
                    paymentType: paymentType,
                    status: 'inProgress',
                    remarks: 'email_link_payment',
                    createdBy: data.userId,
                    createdAt: moment()
                },
                {
                    transaction
                }
            )
            rollbar.info(`email Payment Created`, paymentCreationResult)
            contractNumber = contractNumber.trim()
            const subject = `Payment for agreement ${contractNumber}`
            // eslint-disable-next-line camelcase
            let statement_descriptor = `CL pmt ${agreement.contractNumber.trim()}`
            if (statement_descriptor.length && statement_descriptor.length > 22) {
                // eslint-disable-next-line camelcase
                statement_descriptor = `${agreement.contractNumber.trim()}`
            }
            const paymentRes = await stripeClient.sendPaymentRequestEmail(
                this.payor.stripeCustomerId,
                data.amount,
                subject,
                statement_descriptor,
                {
                    contractNumber,
                    resourceId: this.resourceId,
                    addendumId: addendumId,
                    payorId: data.payorId,
                    partnerId: data.partnerId,
                    currentUserId: data.userId,
                    type: 'email_link_payment',
                    agreementType: agreement.type,
                    timeZone: data.timeZone,
                    currentUserEmail: data.currentUserEmail,
                    paymentCreationResult: paymentCreationResult.id
                }
            )
            const dataToSend = {
                customer_email: paymentRes.customer_email,
                subject,
                contractNumber,
                hosted_invoice_url: paymentRes.hosted_invoice_url
            }
            const { queueNames, queues } = require('../../../appQueues')
            const stripePaymentEmailWorker = queues[queueNames.stripe_payment_email_queue]
            stripePaymentEmailWorker.add('stripePaymentEmailWorker', dataToSend, util.bullJobRetry)
            await transaction.commit()
            return paymentRes
        } catch (error) {
            rollbar.error(`email_payment_error`, error, data)
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }
    /**
     *
     * @param {String} cardToken
     */
    async addCard (cardToken) {
        const transaction = await models.sequelize.transaction()
        let isPayorPartner = false
        try {
            const AgreementController = require('./../agreementController/agreementController')
            const agreement = await this.loadResource(transaction)
            if (agreement.type === AgreementController.TYPES['Wholesale Cremation']) {
                await this._findPartnerPayor(transaction)
                isPayorPartner = true
            } else {
                // it gets payorId
                await this.findPayor(transaction)
            }
            if (!this.payor.stripeCustomerId) {
                await this.createStripeCustomer(isPayorPartner, transaction)
            }
            const card = await stripeClient.createCard(
                this.payor.stripeCustomerId,
                cardToken
            )
            await transaction.commit()
            return {
                id: card.id,
                last4: card.last4,
                exp_month: card.exp_month,
                exp_year: card.exp_year,
                brand: card.brand,
                name: card.name
            }
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    // fetching list of cards of a payor
    async listPayorCards () {
        try {
            const AgreementController = require('./../agreementController/agreementController')
            const agreement = await this.loadResource()
            if (agreement.type === AgreementController.TYPES['Wholesale Cremation']) {
                await this._findPartnerPayor()
            } else {
                // it gets payorId
                await this.findPayor()
            }
            if (!this.payor.stripeCustomerId) {
                return []
            }
            const cards = await stripeClient.customerCards(this.payor.stripeCustomerId)
            const filteredRes = cards.filter(e => e.object === 'card')
            const resObj = filteredRes.map(e => {
                return {
                    id: e.id,
                    last4: e.last4,
                    exp_month: e.exp_month,
                    exp_year: e.exp_year,
                    brand: e.brand,
                    name: e.name
                }
            })
            return resObj
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * deleting the card of a payor
     * @param {String} cardId
     */
    async removeCardOfPayor (cardId) {
        try {
            const AgreementController = require('./../agreementController/agreementController')
            const agreement = await this.loadResource()
            if (agreement.type === AgreementController.TYPES['Wholesale Cremation']) {
                await this._findPartnerPayor()
            } else {
                // it gets payorId
                await this.findPayor()
            }
            if (this.payor && this.payor.stripeCustomerId) {
                const card = await stripeClient.removeCard(
                    this.payor.stripeCustomerId,
                    cardId
                )
                if (card.deleted) {
                    const message = 'CARD_REMOVED_SUCCESSFULLY'
                    return message
                }
            } else {
                throw new Error('PAYOR_NOT_HAVE_STRIPE_CUSTOMERID')
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    async abortDuplicatePaymentWithin10Min (reqBody, paymentType, transaction) {
        try {
            const result = await models.Payment.findOne({
                where: {
                    paymentType: paymentType,
                    amount: reqBody.amount,
                    cardId: reqBody.cardId,
                    resourceId: reqBody.resourceId,
                    createdAt: {
                        [Op.gte]: moment().add(-10, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
                        [Op.lte]: moment().format('YYYY-MM-DD HH:mm:ss')
                    }
                },
                transaction
            })
            if (result) {
                throw new Error('DUPLICATE_CARD_PAYMENT')
            }
        } catch (error) {
            throw error
        }
    }
    /**
     *
     * @param {amount: Number, cardId: String, payorId: String, resourceId: String, remarks: String} reqBody
     * @param {number} userId id of the currently loggedIn user
     */
    async cardPayment (reqBody, currentUser) {
        logger.info(`Card Payment have started for Resource Type: ${reqBody.resourceType ? reqBody.resourceType : ''} Resource Id: ${reqBody.resourceId ? reqBody.resourceId : ''}`)
        const userId = currentUser.id
        const AgreementController = require('./../agreementController/agreementController')
        const paymentType = Object.keys(PaymentTypes).find(e => PaymentTypes[e] === 'Card')
        const transaction = await models.sequelize.transaction()
        try {
            rollbar.log(`card_payment`)
            await this.abortDuplicatePaymentWithin10Min(reqBody, paymentType, transaction)
            const agreement = await this.loadResource(transaction)
            const agreementController = new AgreementController(this.resourceId)
            const paymentDetails = await agreementController.getPaymentCalculations(transaction)
            const balance = paymentDetails.balance
            if (agreement.type === AgreementController.TYPES['Wholesale Cremation']) {
                await this._findPartnerPayor(transaction)
                reqBody.partnerId = reqBody.payorId
                reqBody.payorId = null
            } else {
                // it gets payorId
                await this.findPayor(transaction)
                reqBody.partnerId = null
            }
            // Get the remaining due for validating the amount entered
            const balanceAmount = await this.getRemainingDue(this.resourceId, balance, transaction)
            if (Number(balanceAmount) < Number(reqBody.amount)) {
                throw new Error('AMOUNT_CAN_NOT_BE_GREATER_THAN_BALANCE_AMOUNT')
            }
            // const receiptNumber = await PaymentController.getArrangementTypeAndCreateReceiptNo(
            //     this.resourceId,
            //     transaction
            // )
            try {
                let paymentCreationResult
                paymentCreationResult = await models.Payment.create(
                    {
                        referenceNumber: reqBody.referenceNumber,
                        // receiptNumber: receiptNumber,
                        resourceId: this.resourceId,
                        addendumId: this.addendumId,
                        resourceType: reqBody.resourceType,
                        payorId: reqBody.partnerId ? null : this.payorId,
                        partnerId: reqBody.partnerId,
                        amount: reqBody.amount,
                        paymentType: paymentType,
                        status: 'inProgress',
                        createdBy: userId,
                        createdAt: moment(),
                        cardId: reqBody.cardId,
                        remarks: reqBody.remarks,
                        receiptUrl: reqBody.receiptUrl,
                        receivedBy: userId,
                        emailUrl: reqBody.emailUrl
                    }, { transaction: transaction })
                rollbar.info(`Card Payment Created`, paymentCreationResult)
                if (paymentCreationResult) {
                    const cardPaymentMetaData = {
                        resourceId: this.resourceId,
                        addendumId: this.addendumId,
                        type: 'card_payment',
                        partnerId: reqBody.partnerId,
                        payorId: reqBody.payorId,
                        timeZone: reqBody.timeZone,
                        contractNumber: agreement.contractNumber,
                        agreementType: agreement.type,
                        currentUserId: userId,
                        paymentCreationResult: paymentCreationResult.id,
                        currentUserEmail: currentUser.email
                    }
                    const description = `Payment for agreement ${agreement.contractNumber.trim()}`
                    // eslint-disable-next-line camelcase
                    let statement_descriptor = `CL pmt ${agreement.contractNumber.trim()}`
                    if (statement_descriptor.length && statement_descriptor.length > 22) {
                        // eslint-disable-next-line camelcase
                        statement_descriptor = `${agreement.contractNumber.trim()}`
                    }
                    await transaction.commit()
                    try {
                        const charge = await stripeClient.createCharge(
                            this.payor.stripeCustomerId,
                            reqBody.cardId,
                            reqBody.amount,
                            cardPaymentMetaData,
                            description,
                            statement_descriptor
                        )
                        const transaction1 = await models.sequelize.transaction() // handling stripe updates
                        try {
                            if (charge && charge.status === 'succeeded') {
                                const receiptNumber = await PaymentController.getArrangementTypeAndCreateReceiptNo(
                                    this.resourceId,
                                    transaction1
                                )
                                const otherInfoData = {
                                    cardType: charge.payment_method_details.card.funding,
                                    lastDigits: charge.payment_method_details.card.last4,
                                    brand: charge.payment_method_details.card.brand,
                                    billingAddress: reqBody.billingInformation ? reqBody.billingInformation : {}
                                }
                                await models.Payment.update({
                                    amount: reqBody.amount,
                                    status: 'success',
                                    transactionId: charge.id,
                                    otherInfo: JSON.stringify(otherInfoData),
                                    receiptNumber: receiptNumber
                                }, { where: { id: paymentCreationResult.id } }, { transaction1 })
                                rollbar.info(`Card Payment updated`, paymentCreationResult)
                                // Recording the payment in finance if there is an active financing
                                const FinanceController = require('./../financeController/financeOptionController')
                                const financeController = new FinanceController(this.resourceId)
                                await financeController.addPaymentToSchedule(paymentCreationResult, (charge.amount / 100), transaction1)
                                // finance functionality ends here

                                // updating agreement totals
                                await models.Agreement.updateTotalPaidAndDue(this.resourceId, userId, transaction1)
                                await transaction1.commit()
                                const dataToSend = {
                                    resourceId: this.resourceId,
                                    receiptNumber: receiptNumber,
                                    paymentId: paymentCreationResult.id
                                }
                                const { queueNames, queues } = require('../../../appQueues')
                                const duplicateRecipJob = queues[queueNames.duplicateReceiptJob]
                                duplicateRecipJob.add('duplicateReceiptJob', dataToSend)

                                // updating the reservation type
                                // committing the transaction before,
                                // because there is a new transaction running in updateReservationTypeOnPayment
                                const reservationController = new ReservationController(this.resourceId)
                                await reservationController.updateReservationTypeOnPayment()

                                // preparing background job for sending email with attachment
                                let emailPaymentRes = {
                                    id: paymentCreationResult.id,
                                    templateName: 'paymentPrintTemplate',
                                    agreementId: paymentCreationResult.resourceId,
                                    option: { pageSize: 'A4' },
                                    pdfName: 'Receipt.pdf',
                                    email: this.payor.email || currentUser.email,
                                    type: 'cardPayment',
                                    timeZone: reqBody.timeZone,
                                    currentUserId: userId
                                }
                                if (agreement.type === AgreementController.TYPES['Wholesale Cremation']) {
                                    emailPaymentRes.showPurchasers = false
                                }
                                const generatePDFWorker = queues[queueNames.generate_PDF_queue]
                                generatePDFWorker.add('generatePDFWorker', emailPaymentRes, util.bullJobRetry)

                                logger.info(`At card payment API: Card Payment have been completed for ${emailPaymentRes.id ? emailPaymentRes.id : ''}`)
                            } else {
                                await models.Payment.update({
                                    amount: reqBody.amount,
                                    status: charge.status,
                                    transactionId: charge.id
                                }, { where: { id: paymentCreationResult.id } }, { transaction1 })
                                rollbar.info(`Card Payment updated`, paymentCreationResult)
                                await transaction1.commit()
                            }
                            return paymentCreationResult
                        } catch (err) {
                            await transaction1.rollback()
                            throw err
                        }
                    } catch (err) {
                        await models.Payment.update({
                            status: 'failed'
                        }, { where: { id: paymentCreationResult.id } })
                        throw err
                    }
                } else {
                    throw new Error('Error while creating Payment with inProgress state')
                }
            } catch (err) {
                throw err
            }
        } catch (error) {
            if (error.code === 'card_declined') {
                throw error
            } else {
                rollbar.error(`card_payment_error`, error)
                await transaction.rollback()
                logger.info(`Card Payment Transaction Deadlock for Resource Type: ${reqBody.resourceType ? reqBody.resourceType : ''} Resource id: ${reqBody.resourceId ? reqBody.resourceId : ''} at ${JSON.stringify(error)}`)
                throw error
            }
        }
    }

    /**
     *
     * @param {Object<{resourceId: String, organizationId: Number, amount: Number, resourceType: String, policyNumber: String }>} reqData
     */
    async addAnticipatedPayment (reqData) {
        try {
            await this.loadResource()
            const orgCheck = await models.Organization.findOne({
                where: { id: reqData.organizationId }
            })
            if (orgCheck) {
                await models.AnticipatedPayment.create(reqData)
                const anticipatedPayments = await this.getListOfAnticipated()
                return { anticipatedPayments }
            } else {
                throw new Error('ORGANIZATION_NOT_FOUND')
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * checking Paid In Full discount is applied to a agreement/addendum
     * @param {Number} agreementId
     */
    async isPIFDiscountApplied (agreementId, transaction) {
        try {
            const addendumId = await models.sequelize.query(`SELECT TOP 1 id FROM Addendum WHERE agreementId = :agreementId ORDER BY id DESC`, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: agreementId
                },
                transaction
            })

            let addendumPart = ``
            let replacements = {
                agreementId: agreementId
            }
            if (addendumId.length > 0) {
                replacements.addendumId = addendumId[0].id
                addendumPart = ` AND addendumId = :addendumId`
            }

            const isPIFDiscountApplied = await models.sequelize.query(`SELECT COUNT(*) AS count FROM AgreementAdjustment AS aa
            INNER JOIN Adjustment AS a ON aa.adjustmentId = a.id
            WHERE agreementId= :agreementId ${addendumPart} AND aa.adjustmentId = 4 AND aa.deletedAt IS NULL AND aa.deletedBy IS NULL`, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: replacements,
                transaction
            })

            return !!isPIFDiscountApplied[0].count
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * checking if financing have been opted to a agreement/addendum
     * @param {Number} agreementId
     */
    async isFinancingApplied (agreementId, transaction) {
        try {
            const addendumId = await models.sequelize.query(`SELECT TOP 1 id FROM Addendum WHERE agreementId = :agreementId ORDER BY id DESC`, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: agreementId
                },
                transaction
            })

            let addendumPart = ``
            let replacements = {
                agreementId: agreementId
            }
            if (addendumId.length > 0) {
                replacements.addendumId = addendumId[0].id
                addendumPart = ` AND addendumId = :addendumId`
            }

            const isFinancingApplied = await models.sequelize.query(`
            SELECT
            AgreementFinance.tenureMonths
            FROM AgreementFinance
            WHERE agreementId= :agreementId 
            ${addendumPart}
            AND isActive = 1
            AND isRecent = 1`, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: replacements,
                transaction
            })

            return {
                isFinancingApplied: !!_.get(isFinancingApplied, 'length', 0),
                tenureMonths: _.get(isFinancingApplied[0], 'tenureMonths', 0)
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    async getCartDetails () {
        // TODO: Why we need a transaction for SELECT query here. Clean up unnecessary code
        const FinanceController = require('../financeController/financeOptionController')
        const transaction = await models.sequelize.transaction()
        try {
            let cartValues = {}
            const agreement = await this.loadResource(transaction)
            const anticipatedTotal = await models.sequelize.query(`SELECT sum(amount)  totalPaid FROM AnticipatedPayment where resourceId = :agreementId AND resourceType = 'Agreement' AND paymentId IS NULL`, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.resourceId
                },
                transaction
            })
            if (agreement) {
                agreement.dataValues['anticipatedTotal'] = anticipatedTotal.length && anticipatedTotal[0].totalPaid ? anticipatedTotal[0].totalPaid : 0
            }
            cartValues = { ...agreement.toJSON() }
            // Financing amount details
            const financeController = new FinanceController(this.resourceId)
            // const financeDetails = await financeController.getAgreementFinance(false, transaction)
            // Need to remove this if condition after new finance changes are integrated by FE
            // if ((_.get(financeDetails, 'financeType') === 'Finance') || (_.get(financeDetails, 'financeType') === 'Refinance') || (_.get(financeDetails, 'approval.status') === _.get(ApprovalController, 'ApprovalStatus.Approved'))) {
            //     // putting few details from financeDetails to cartValues.
            //     cartValues = (({ financedAmount, interestAmount }) => ({
            //         ...cartValues, financedAmount, interestAmount
            //     }))(financeDetails)
            //     cartValues.financeTotalAmount = financeDetails.totalAmount
            // }
            const finances = await financeController.getAllFinancesExceptRevoked(transaction)
            const interest = await financeController.getTotalInterest(finances, transaction)
            cartValues.finances = finances
            cartValues.totalSalesPrice = (agreement.totalCashPrice + interest).toFixed(2)
            cartValues.isPIFDiscountApplied = await this.isPIFDiscountApplied(this.resourceId, transaction)
            let financeDetails = await this.isFinancingApplied(this.resourceId, transaction)
            cartValues.isFinancingApplied = financeDetails.isFinancingApplied
            if (financeDetails.isFinancingApplied) {
                cartValues.tenureMonths = financeDetails.tenureMonths
            }

            // Fetching details required for the payOffAmount
            const AgreementController = require('./../agreementController/agreementController')
            const agreementController = new AgreementController(this.resourceId)
            const paymentDetails = await agreementController.getPaymentCalculations(transaction)
            let payOffAmount = await this.getRemainingDue(this.resourceId, paymentDetails.balance, transaction)
            if (Number(payOffAmount) && Number(payOffAmount) > 0) {
                cartValues.payOffAmount = Number(payOffAmount)
            }
            await transaction.commit()
            return cartValues
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    async getAnticipatedPayments () {
        try {
            const anticipatedPayments = await this.getListOfAnticipated()
            return { anticipatedPayments }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     *
     * @param {Object<{anticipatedPaymentId: Number, amount: Number, receivedAt: Date, referenceNumber: String}>} data
     */
    async addReceiveAmount (data) {
        logger.info(`Anticipated Payment process`)
        const AgreementController = require('./../agreementController/agreementController')
        const FinanceController = require('./../financeController/financeOptionController')
        const transaction = await models.sequelize.transaction()
        try {
            rollbar.log('anticipatedti_payment', data)
            let anticipatedPayment = await models.AnticipatedPayment.findOne({
                where: { id: data.anticipatedPaymentId },
                transaction
            })
            if (anticipatedPayment) {
                if (!anticipatedPayment.paymentId) {
                    logger.info(`Anticipated Payment have started for Resource Type: ${anticipatedPayment.resourceType ? anticipatedPayment.resourceType : ''} Resource Id: ${anticipatedPayment.resourceId ? anticipatedPayment.resourceId : ''}`)
                    this.setResource(anticipatedPayment.resourceId)
                    await this.loadResource(transaction)
                    // let outcome = await models.sequelize.transaction(async transaction => {
                    data.paymentType = util.getKey(PaymentTypes, 'Anticipated payment')
                    data.receiptNumber = await PaymentController.getArrangementTypeAndCreateReceiptNo(anticipatedPayment.resourceId, transaction)
                    data.organizationId = anticipatedPayment.organizationId
                    data.createdAt = data.updatedAt = new Date()
                    data.resourceId = anticipatedPayment.resourceId
                    data.resourceType = anticipatedPayment.resourceType
                    data.status = 'success'
                    data.addendumId = this.addendumId
                    let payment = await AgreementController.addPayment(
                        data,
                        transaction
                    )
                    rollbar.info('Anticipatedti Payment', payment)
                    // Recording the payment in finance if there is an active financing
                    const financeController = new FinanceController(this.resourceId)
                    await financeController.addPaymentToSchedule(payment, payment.amount, transaction)
                    await models.AnticipatedPayment.update(
                        { paymentId: payment.id, receivedAt: data.receivedAt },
                        {
                            where: { id: data.anticipatedPaymentId },
                            transaction
                        }
                    )
                    let result = await models.AnticipatedPayment.findOne({
                        where: { id: data.anticipatedPaymentId },
                        include: [
                            {
                                model: models.Payment,
                                as: 'payment'
                            }
                        ],
                        transaction
                    })
                    // return result
                    // })
                    await models.Agreement.updateTotalPaidAndDue(anticipatedPayment.resourceId, data.createdBy, transaction)
                    const agreementController = new AgreementController(
                        anticipatedPayment.resourceId
                    )
                    const paymentCalculations = await agreementController.getPaymentCalculations(
                        transaction
                    )
                    let finalResult = result.toJSON()
                    finalResult.totalAmount = paymentCalculations.totalAmount
                    finalResult.totalPaid = paymentCalculations.totalPaid
                    finalResult.balance = paymentCalculations.balance
                    await transaction.commit()
                    logger.info(`Anticipated Payment have been completed for Resource Type: ${anticipatedPayment.resourceType ? anticipatedPayment.resourceType : ''} Resource Id: ${anticipatedPayment.resourceId ? anticipatedPayment.resourceId : ''} ${finalResult.id ? finalResult.id : ''}`)
                    // updating the reservation type
                    // committing the transaction before,
                    // because there is a new transaction running in updateReservationTypeOnPayment
                    const reservationController = new ReservationController(anticipatedPayment.resourceId)
                    await reservationController.updateReservationTypeOnPayment()
                    return { anticipatedPayment: finalResult }
                } else {
                    throw new Error('ANTICIPATED_AMOUT_ALREADY_RECEIVED')
                }
            } else {
                throw new Error('ANTICIPATED_NOT_FOUND')
            }
        } catch (error) {
            rollbar.error('anticipatedti_Payment_error', error, data)
            await transaction.rollback()
            logger.info(`Anticipated Payment Transaction Deadlock for Resource Type: ${data.resourceType ? data.resourceType : ''} Resource Id: ${data.resourceId ? data.resourceId : ''} Deadlock at ${JSON.stringify(error)}`)
            throw error
        }
    }

    async getListOfAnticipated () {
        let result = await models.AnticipatedPayment.findAll({
            where: { resourceId: this.resourceId },
            include: [
                {
                    model: models.Payment,
                    as: 'payment'
                },
                {
                    model: models.Organization,
                    as: 'organization',
                    attributes: ['name']
                }
            ]
        })
        let finalResult = _.map(JSON.parse(JSON.stringify(result)), res => {
            res.organizationName = res.organization.name
            delete res.organization
            return res
        })
        return finalResult
    }

    async stripeWebhookHandler (stripeInput, currentUserId) {
        const AgreementController = require('./../agreementController/agreementController')
        try {
            if (stripeInput && stripeInput.type) {
                let result
                const LegalName = 'Brand Name'
                // Updating stripe payment event Id inorder to refresh paymetns for failed/pending payments
                await models.Payment.update({
                    webHookEventId: _.get(stripeInput, 'id', null)
                }, { where: { id: _.get(stripeInput, 'data.object.metadata.paymentCreationResult', null) } })
                switch (stripeInput.type) {
                case 'charge.succeeded':
                    rollbar.log('card_payment_charge.succeeded', stripeInput, currentUserId)
                    logger.info(`Payments webhook Logger at charge.succeeded event`)
                    if (stripeInput.data && stripeInput.data.object && stripeInput.data.object.metadata && stripeInput.data.object.metadata.type === 'card_payment') {
                        const FinanceController = require('./../financeController/financeOptionController')
                        const metaDataFromStripe = stripeInput.data ? stripeInput.data.object.metadata : null
                        if (metaDataFromStripe) {
                            const transaction = await models.sequelize.transaction()
                            logger.info(`card Payment webhook have started for Resource Id: ${metaDataFromStripe.resourceId ? metaDataFromStripe.resourceId : ''}`)
                            try {
                                if (Number(stripeInput.data.object.metadata.agreementType) === AgreementController.TYPES['Wholesale Cremation']) {
                                    await this._findPartnerPayor(transaction)
                                } else {
                                    await this.findPayor(transaction)
                                }
                                await this.loadResource(transaction)
                                const otherInfoData = {
                                    cardType: stripeInput.data.object.payment_method_details.card.funding,
                                    lastDigits: stripeInput.data.object.payment_method_details.card.last4,
                                    brand: stripeInput.data.object.payment_method_details.card.brand,
                                    billingAddress: stripeInput.data.object.billingInformation
                                        ? stripeInput.data.object.billingInformation
                                        : {}
                                }
                                result = await models.Payment.findOne({ where: { id: metaDataFromStripe.paymentCreationResult } })
                                if (result && result.status === 'success' && stripeInput.data.object.status === 'succeeded') {
                                    logger.info(`Success for charge.succeeded at first if stmt, ${JSON.stringify(result)}, ${stripeInput.data.object.status}`)
                                    logger.info(`Card Payment status is success, So.. not doing any changes as we have already did action for success in cardPayment API}`)
                                    await models.Payment.update({ webHookEventId: null }, {
                                        where: {
                                            id: metaDataFromStripe.paymentCreationResult
                                        }
                                    }, { transaction })
                                    return { message: 'Card Payment status is success, So.. not doing any changes as we have already did action for success in cardPayment API' }
                                } else if (result && result.status !== 'success' && stripeInput.data.object.status === 'succeeded') {
                                    const receiptNumber = await PaymentController.getArrangementTypeAndCreateReceiptNo(
                                        this.resourceId,
                                        transaction
                                    )
                                    const paymentObj = {
                                        amount: stripeInput.data.object.amount ? (stripeInput.data.object.amount / 100) : 0,
                                        status: stripeInput.data.object.status === 'succeeded' ? 'success' : 'failed',
                                        transactionId: stripeInput.data.object.id,
                                        otherInfo: JSON.stringify(otherInfoData),
                                        receiptNumber: receiptNumber
                                    }
                                    if (stripeInput.data.object.status === 'succeeded') {
                                        paymentObj.webHookEventId = null
                                    }
                                    await models.Payment.update(paymentObj, {
                                        where: {
                                            id: metaDataFromStripe.paymentCreationResult
                                        }
                                    }, { transaction })
                                    // Recording the payment in finance if there is an active financing
                                    const financeController = new FinanceController(metaDataFromStripe.resourceId)
                                    await financeController.addPaymentToSchedule(result, (stripeInput.data.object.amount / 100), transaction)
                                    // finance functionality ends here

                                    // updating agreement totals
                                    await models.Agreement.updateTotalPaidAndDue(metaDataFromStripe.resourceId, currentUserId, transaction)

                                    const fetchPayorEmail = await models.Person.findOne({
                                        include: [
                                            {
                                                model: models.AgreementPerson,
                                                as: 'agreementPersons',
                                                where: {
                                                    id: result.payorId || result.partnerId
                                                }
                                            }
                                        ]
                                    })

                                    // preparing background job for sending email with attachment
                                    let emailPaymentRes = {
                                        id: result.id,
                                        templateName: 'paymentPrintTemplate',
                                        agreementId: result.resourceId,
                                        option: { pageSize: 'A4' },
                                        pdfName: 'Receipt.pdf',
                                        email: fetchPayorEmail && fetchPayorEmail.email ? fetchPayorEmail.email : stripeInput.data.object.currentUserEmail,
                                        type: 'cardPayment',
                                        timeZone: metaDataFromStripe.timeZone,
                                        currentUserId
                                    }
                                    if (Number(metaDataFromStripe.agreementType) === AgreementController.TYPES['Wholesale Cremation']) {
                                        emailPaymentRes.showPurchasers = false
                                    }
                                    const { queueNames, queues } = require('../../../appQueues')
                                    const generatePDFWorker = queues[queueNames.generate_PDF_queue]
                                    generatePDFWorker.add('generatePDFWorker', emailPaymentRes, util.bullJobRetry)
                                    await transaction.commit()
                                    logger.info(`Card Payment have been completed for ${emailPaymentRes.id ? emailPaymentRes.id : ''}`)
                                    // updating the reservation type
                                    // committing the transaction before,
                                    // because there is a new transaction running in updateReservationTypeOnPayment
                                    const reservationController = new ReservationController(metaDataFromStripe.resourceId)
                                    await reservationController.updateReservationTypeOnPayment()
                                    logger.info(`Success for charge.succeeded at first else if stmt , ${result}`)
                                    logger.info(`Card Payment have completed for Resource Id: ${metaDataFromStripe.resourceId ? metaDataFromStripe.resourceId : ''}`)
                                } else if (!result) {
                                    const receiptNumber = await PaymentController.getArrangementTypeAndCreateReceiptNo(
                                        metaDataFromStripe.resourceId,
                                        transaction
                                    )
                                    const paymentType = Object.keys(PaymentTypes).find(e => PaymentTypes[e] === 'Email Request')
                                    result = await models.Payment.create({
                                        receiptNumber: receiptNumber,
                                        transactionId: stripeInput.data.object.id,
                                        resourceId: metaDataFromStripe.resourceId,
                                        addendumId: metaDataFromStripe.addendumId,
                                        resourceType: 'Agreement',
                                        payorId: metaDataFromStripe.payorId,
                                        partnerId: metaDataFromStripe.partnerId,
                                        amount: stripeInput.data.object.amount ? (stripeInput.data.object.amount / 100) : 0,
                                        paymentType: paymentType,
                                        status: stripeInput.data.object.status === 'succeeded' ? 'success' : 'failed',
                                        cardId: stripeInput.data.object.payment_method,
                                        createdBy: metaDataFromStripe.currentUserId,
                                        receivedBy: metaDataFromStripe.currentUserId,
                                        otherInfo: JSON.stringify(otherInfoData),
                                        createdAt: moment(),
                                        webHookEventId: stripeInput.data.object.status === 'succeeded' ? null : _.get(stripeInput, 'id', null)
                                    }, { transaction })
                                    rollbar.info('card payment charge succeeded', result, stripeInput)
                                    // Recording the payment in finance if there is an active financing
                                    const financeController = new FinanceController(metaDataFromStripe.resourceId)
                                    await financeController.addPaymentToSchedule(result, (stripeInput.data.object.amount_paid / 100), transaction)
                                    // finance functionality ends here

                                    // updating agreement totals
                                    await models.Agreement.updateTotalPaidAndDue(metaDataFromStripe.resourceId, currentUserId, transaction)

                                    const fetchPayorEmail = await models.Person.findOne({
                                        include: [
                                            {
                                                model: models.AgreementPerson,
                                                as: 'agreementPersons',
                                                where: {
                                                    id: result.payorId || result.partnerId
                                                }
                                            }
                                        ]
                                    })

                                    // preparing background job for sending email with attachment
                                    let emailPaymentRes = {
                                        id: result.id,
                                        templateName: 'paymentPrintTemplate',
                                        agreementId: result.resourceId,
                                        option: { pageSize: 'A4' },
                                        pdfName: 'Receipt.pdf',
                                        email: fetchPayorEmail && fetchPayorEmail.email ? fetchPayorEmail.email : stripeInput.data.object.currentUserEmail,
                                        type: 'cardPayment',
                                        timeZone: metaDataFromStripe.timeZone,
                                        currentUserId
                                    }
                                    if (Number(metaDataFromStripe.agreementType) === AgreementController.TYPES['Wholesale Cremation']) {
                                        emailPaymentRes.showPurchasers = false
                                    }
                                    const { queueNames, queues } = require('../../../appQueues')
                                    const generatePDFWorker = queues[queueNames.generate_PDF_queue]
                                    generatePDFWorker.add('generatePDFWorker', emailPaymentRes, util.bullJobRetry)
                                    await transaction.commit()
                                    logger.info(`New cardPayment inserted: Card Payment have been completed for ${emailPaymentRes.id ? emailPaymentRes.id : ''}`)
                                    // updating the reservation type
                                    // committing the transaction before,
                                    // because there is a new transaction running in updateReservationTypeOnPayment
                                    const reservationController = new ReservationController(metaDataFromStripe.resourceId)
                                    await reservationController.updateReservationTypeOnPayment()
                                    logger.info(`Success for charge.succeeded at second elseif stmt, ${result}`)
                                    logger.info(`Card Payment have completed for Resource Id: ${metaDataFromStripe.resourceId ? metaDataFromStripe.resourceId : ''}`)
                                } else {
                                    logger.info(`Success for charge.succeeded at else stmt , ${result}`)
                                    logger.info(`Card Payment have completed Not doing any modifications`)
                                }
                                return result
                            } catch (error) {
                                rollbar.error('card_payment_charge_succeeded', error, stripeInput)
                                await transaction.rollback()
                                logger.info(`charge.succeeded failure case ${error}`)
                                logger.info(`Card Payment Transaction Deadlock for Resource Id: ${metaDataFromStripe.resourceId ? metaDataFromStripe.resourceId : ''} at ${JSON.stringify(error)}`)
                                logger.error(error)
                                throw error
                            }
                        } else {
                            logger.info(`Meta data not found for stripe payment`)
                            return { message: 'metadata not found' }
                        }
                    } else {
                        logger.info(`charge succeeded webhook failed. not able to fetch or match ${JSON.stringify(stripeInput.data.object.metadata.type)}`)
                        return { message: `charge succeeded webhook failed. not able to fetch or match ${JSON.stringify(stripeInput.data.object.metadata.type)}` }
                    }
                case 'charge.failed':
                    logger.info(`Payments webhook Logger at charge.failed event`)
                    try {
                        rollbar.log('card_payment_charge.failed', stripeInput, currentUserId)
                        if (stripeInput.data && stripeInput.data.object && stripeInput.data.object.metadata && stripeInput.data.object.metadata.type === 'card_payment') {
                            const metaDataFromStripe = stripeInput.data ? stripeInput.data.object.metadata : null
                            if (metaDataFromStripe) {
                                const transaction = await models.sequelize.transaction()
                                try {
                                    logger.info(`Card Payment status is failure webhook`)
                                    logger.info(`charge.failed event -- card Payment webhook have started for Resource Id: ${metaDataFromStripe.resourceId ? metaDataFromStripe.resourceId : ''}`)
                                    await this.loadResource(transaction)
                                    const otherInfoData = {
                                        cardType: stripeInput.data.object.payment_method_details.card.funding,
                                        lastDigits: stripeInput.data.object.payment_method_details.card.last4,
                                        brand: stripeInput.data.object.payment_method_details.card.brand,
                                        billingAddress: stripeInput.data.object.billingInformation
                                            ? stripeInput.data.object.billingInformation
                                            : {}
                                    }
                                    result = await models.Payment.findOne({ where: { id: metaDataFromStripe.paymentCreationResult } })
                                    if (result) {
                                        await models.Payment.update({
                                            amount: stripeInput.data.object.amount ? (stripeInput.data.object.amount / 100) : 0,
                                            status: stripeInput.data.object.status,
                                            transactionId: stripeInput.data.object.id,
                                            otherInfo: JSON.stringify(otherInfoData)
                                        }, {
                                            where: {
                                                id: metaDataFromStripe.paymentCreationResult
                                            }
                                        }, { transaction })
                                    }
                                    await transaction.commit()
                                } catch (err) {
                                    await transaction.rollback()
                                    logger.info(`charge.succeeded failure case ${err}`)
                                    logger.info(`Card Payment Transaction Deadlock for Resource Id: ${metaDataFromStripe.resourceId ? metaDataFromStripe.resourceId : ''} at ${JSON.stringify(err)}`)
                                    throw err
                                }
                                const agreement = await models.Agreement.findOne({ where: { id: metaDataFromStripe.resourceId } })
                                let payorDetails
                                if (agreement.type === AgreementController.TYPES['Wholesale Cremation']) {
                                    payorDetails = await models.AgreementPartner.scope('withPartnerDetails').findOne({
                                        where: {
                                            agreementId: metaDataFromStripe.resourceId
                                        }
                                    })
                                    payorDetails['person'] = payorDetails.partner.contact
                                    payorDetails['person']['stripeCustomerId'] = _.get(payorDetails, 'partner.stripeCustomerId')
                                } else {
                                    payorDetails = await models.AgreementPerson.findOne({
                                        where: { id: metaDataFromStripe.payorId, agreementId: metaDataFromStripe.resourceId },
                                        include: [{
                                            model: models.Person,
                                            attributes: ['firstName', 'middleName', 'lastName', 'email', 'stripeCustomerId'],
                                            as: 'person'
                                        }]
                                    })
                                }
                                let currentUser = await models.User.findOne({ where: { id: currentUserId } })
                                const ccEmail = currentUser && currentUser.email ? currentUser.email : ''
                                let content = `Hi ${[payorDetails.person.firstName, payorDetails.person.middleName, payorDetails.person.lastName]
                                    .join(' ')
                                    .trim()}, \n\n Your credit card payment for agreement ${agreement.contractNumber} of amount $${(stripeInput.data.object.amount / 100)} has failed. Please contact ${LegalName} for more information. \n\nBest Regards, \n${LegalName}`
                                if (stripeInput.data.object.customer === payorDetails.person.stripeCustomerId) {
                                    Email.sendMail(payorDetails.person.email, `Credit payment failed for agreement ${agreement.contractNumber}`, content, null, null, [ccEmail])
                                }
                                rollbar.info('card payment charge failed', stripeInput)
                                logger.info(`Card payment-failed event success`)
                                return { message: 'Card payment-failed event success' }
                            }
                        } else {
                            logger.info(`Card payment-failed webhook failed`)
                            return { message: 'Card payment-failed webhook failed' }
                        }
                    } catch (err) {
                        rollbar.error('card_payment_charge_failed_error', err, stripeInput)
                        logger.info(`charge.failed event failure case ${err}`)
                        logger.error(err)
                        throw err
                    }
                    return result
                case 'invoice.payment_succeeded':
                    rollbar.log('email_payment_invoice.payment_succeeded', stripeInput, currentUserId)
                    logger.info(`Payments webhook Logger at invoice.payment_succeeded event`)
                    const FinanceController = require('./../financeController/financeOptionController')
                    if (stripeInput.data && stripeInput.data.object && stripeInput.data.object.metadata && stripeInput.data.object.metadata.type === 'email_link_payment') {
                        const metaDataFromStripe = stripeInput.data ? stripeInput.data.object.metadata : null
                        if (metaDataFromStripe) {
                            const transaction = await models.sequelize.transaction()
                            logger.info(`Link Payment have started for Resource Id: ${metaDataFromStripe.resourceId ? metaDataFromStripe.resourceId : ''}`)
                            try {
                                if (Number(stripeInput.data.object.metadata.agreementType) === AgreementController.TYPES['Wholesale Cremation']) {
                                    await this._findPartnerPayor(transaction)
                                } else {
                                    await this.findPayor(transaction)
                                }
                                await this.loadResource(transaction)
                                const receiptNumber = await PaymentController.getArrangementTypeAndCreateReceiptNo(
                                    metaDataFromStripe.resourceId,
                                    transaction
                                )
                                const paymentType = Object.keys(PaymentTypes).find(e => PaymentTypes[e] === 'Email Request')
                                let otherInfoData = {}
                                if (stripeInput.data.object && stripeInput.data.object.charge) {
                                    const chargeResult = await stripeClient.retrieveCharge(stripeInput.data.object.charge)
                                    if (chargeResult) {
                                        otherInfoData = {
                                            cardType: chargeResult.payment_method_details.card.funding,
                                            lastDigits: chargeResult.payment_method_details.card.last4,
                                            brand: chargeResult.payment_method_details.card.brand,
                                            billingAddress: chargeResult.billing_details ? chargeResult.billing_details : {}
                                        }
                                    }
                                }
                                result = await models.Payment.findOne({ where: { id: metaDataFromStripe.paymentCreationResult } })
                                if (result && result.status === 'success' && stripeInput.data.object.status === 'paid') {
                                    logger.info(`Success for invoice.succeeded at first if stmt, ${JSON.stringify(result)}, ${stripeInput.data.object.status}`)
                                    logger.info(`email Payment status is success, So.. not doing any changes as we have already did action for success in emailPayment API}`)
                                    await models.Payment.update({ webHookEventId: null }, {
                                        where: {
                                            id: metaDataFromStripe.paymentCreationResult
                                        }
                                    }, { transaction })
                                    return { message: 'email Payment status is success, So.. not doing any changes as we have already did action for success in emailPayment API' }
                                } else if (result && result.status !== 'success' && stripeInput.data.object.status === 'paid') {
                                    await models.Payment.update({
                                        amount: stripeInput.data.object.amount_paid ? (stripeInput.data.object.amount_paid / 100) : 0,
                                        status: 'success',
                                        transactionId: stripeInput.data.object.charge,
                                        otherInfo: JSON.stringify(otherInfoData),
                                        receiptNumber: receiptNumber,
                                        webHookEventId: null
                                    }, {
                                        where: {
                                            id: metaDataFromStripe.paymentCreationResult
                                        }
                                    }, { transaction })
                                    rollbar.info('email payment update webhook ', stripeInput)
                                    logger.info(`invoice success event at payment update payment id : ${metaDataFromStripe.paymentCreationResult ? metaDataFromStripe.paymentCreationResult : ''}`)
                                } else if (!result) {
                                    result = await models.Payment.create({
                                        receiptNumber: receiptNumber,
                                        resourceId: metaDataFromStripe.resourceId,
                                        addendumId: metaDataFromStripe.addendumId,
                                        resourceType: 'Agreement',
                                        payorId: metaDataFromStripe.payorId,
                                        partnerId: metaDataFromStripe.partnerId,
                                        amount: stripeInput.data.object.amount_paid ? (stripeInput.data.object.amount_paid / 100) : 0,
                                        transactionId: stripeInput.data.object.charge,
                                        otherInfo: JSON.stringify(otherInfoData),
                                        paymentType: paymentType,
                                        status: 'success',
                                        remarks: 'email_link_payment',
                                        createdBy: metaDataFromStripe.currentUserId,
                                        createdAt: moment()
                                    },
                                    {
                                        transaction
                                    })
                                    rollbar.info('email payment created webhook ', stripeInput)
                                    logger.info(`invoice success event at payment create else case : ${metaDataFromStripe.paymentCreationResult ? metaDataFromStripe.paymentCreationResult : ''}`)
                                }
                                // Recording the payment in finance if there is an active financing
                                const financeController = new FinanceController(metaDataFromStripe.resourceId)
                                await financeController.addPaymentToSchedule(result, (stripeInput.data.object.amount_paid / 100), transaction)
                                // finance functionality ends here

                                // updating agreement totals
                                await models.Agreement.updateTotalPaidAndDue(metaDataFromStripe.resourceId, currentUserId, transaction)

                                // preparing background job for sending email with attachment
                                let emailPaymentRes = {
                                    id: result.id,
                                    templateName: 'paymentPrintTemplate',
                                    agreementId: result.resourceId,
                                    option: { pageSize: 'A4' },
                                    pdfName: 'Receipt.pdf',
                                    email: stripeInput.data.object.customer_email || stripeInput.data.object.currentUserEmail,
                                    type: 'cardPayment',
                                    timeZone: metaDataFromStripe.timeZone,
                                    currentUserId
                                }
                                if (Number(metaDataFromStripe.agreementType) === AgreementController.TYPES['Wholesale Cremation']) {
                                    emailPaymentRes.showPurchasers = false
                                }
                                const { queueNames, queues } = require('../../../appQueues')
                                const generatePDFWorker = queues[queueNames.generate_PDF_queue]
                                generatePDFWorker.add('generatePDFWorker', emailPaymentRes, util.bullJobRetry)
                                await transaction.commit()
                                logger.info(`Invoice Payment have been completed for ${emailPaymentRes.id ? emailPaymentRes.id : ''}`)
                                // updating the reservation type
                                // committing the transaction before,
                                // because there is a new transaction running in updateReservationTypeOnPayment
                                const reservationController = new ReservationController(metaDataFromStripe.resourceId)
                                await reservationController.updateReservationTypeOnPayment()
                                logger.info(`Success for invoice.payment_succeeded, ${JSON.stringify(result)}`)
                                logger.info(`Link Payment have completed for Resource Id: ${metaDataFromStripe.resourceId ? metaDataFromStripe.resourceId : ''}`)
                                return result
                            } catch (error) {
                                rollbar.error('email_payment_invoice_payment_succeeded_error', error, stripeInput)
                                await transaction.rollback()
                                logger.info(`invoice.payment_succeeded failure case ${error}`)
                                logger.info(`Invoice Payment Transaction Deadlock for Resource Id: ${metaDataFromStripe.resourceId ? metaDataFromStripe.resourceId : ''} at ${JSON.stringify(error)}`)
                                logger.error(error)
                                throw error
                            }
                        } else {
                            logger.info(`Meta data not found for stripe payment`)
                            return { message: 'metadata not found' }
                        }
                    } else {
                        logger.info(`Invoice payment-success webhook failed`)
                        return { message: 'Invoice payment-success webhook failed' }
                    }
                case 'invoice.payment_failed':
                    try {
                        rollbar.log('email_payment_invoice.payment_failed', stripeInput, currentUserId)
                        logger.info(`Payments webhook Logger at invoice.payment_failed event`)
                        if (stripeInput.data && stripeInput.data.object && stripeInput.data.object.metadata && stripeInput.data.object.metadata.type === 'email_link_payment') {
                            const metaDataFromStripe = stripeInput.data ? stripeInput.data.object.metadata : null
                            if (metaDataFromStripe) {
                                const transaction = await models.sequelize.transaction()
                                try {
                                    logger.info(`Card Payment status is failure webhook`)
                                    logger.info(`charge.failed event -- card Payment webhook have started for Resource Id: ${metaDataFromStripe.resourceId ? metaDataFromStripe.resourceId : ''}`)
                                    await this.loadResource(transaction)
                                    const otherInfoData = {
                                        cardType: stripeInput.data.object.payment_method_details ? stripeInput.data.object.payment_method_details.card.funding : null,
                                        lastDigits: stripeInput.data.object.payment_method_details ? stripeInput.data.object.payment_method_details.card.last4 : null,
                                        brand: stripeInput.data.object.payment_method_details ? stripeInput.data.object.payment_method_details.card.brand : null,
                                        billingAddress: stripeInput.data.object.billingInformation
                                            ? stripeInput.data.object.billingInformation
                                            : {}
                                    }
                                    result = await models.Payment.findOne({ where: { id: metaDataFromStripe.paymentCreationResult } })
                                    if (result) {
                                        await models.Payment.update({
                                            amount: stripeInput.data.object.amount ? (stripeInput.data.object.amount / 100) : 0,
                                            status: stripeInput.data.object.status,
                                            transactionId: stripeInput.data.object.id,
                                            otherInfo: JSON.stringify(otherInfoData)
                                        }, {
                                            where: {
                                                id: metaDataFromStripe.paymentCreationResult
                                            }
                                        }, { transaction })
                                    }
                                    await transaction.commit()
                                } catch (err) {
                                    await transaction.rollback()
                                    logger.info(`charge.succeeded failure case ${err}`)
                                    logger.info(`Card Payment Transaction Deadlock for Resource Id: ${metaDataFromStripe.resourceId ? metaDataFromStripe.resourceId : ''} at ${JSON.stringify(err)}`)
                                    throw err
                                }
                                const agreement = await models.Agreement.findOne({ where: { id: metaDataFromStripe.resourceId } })
                                let payorDetails
                                if (agreement.type === AgreementController.TYPES['Wholesale Cremation']) {
                                    payorDetails = await models.AgreementPartner.scope('withPartnerDetails').findOne({
                                        where: {
                                            agreementId: metaDataFromStripe.resourceId
                                        }
                                    })
                                    payorDetails['person'] = payorDetails.partner.contact
                                } else {
                                    payorDetails = await models.AgreementPerson.findOne({
                                        where: { id: metaDataFromStripe.payorId, agreementId: metaDataFromStripe.resourceId },
                                        include: [{
                                            model: models.Person,
                                            attributes: ['firstName', 'middleName', 'lastName'],
                                            as: 'person'
                                        }]
                                    })
                                }
                                let currentUser = await models.User.findOne({ where: { id: currentUserId } })
                                const ccEmail = currentUser && currentUser.email ? currentUser.email : ''
                                let content = `Hi ${[payorDetails.person.firstName, payorDetails.person.middleName, payorDetails.person.lastName]
                                    .join(' ')
                                    .trim()}, \n\n Your credit card payment for agreement ${agreement.contractNumber} of amount $ ${(stripeInput.data.object.amount_due / 100)} has failed. Please contact ${LegalName} for more information. \n\nBest Regards, \n${LegalName}`
                                Email.sendMail(stripeInput.data.object.customer_email, `Credit payment failed for agreement ${agreement.contractNumber}`, content, null, null, [ccEmail])
                                rollbar.info('invoice payment-failed webhook success', stripeInput)
                                return { message: 'invoice payment-failed webhook success' }
                            }
                        } else {
                            logger.info(`Invoice payment-failure webhook failed`)
                            return { message: 'Invoice payment-failure webhook failed' }
                        }
                    } catch (err) {
                        rollbar.error('email_payment_invoice_payment_failed_error', err, stripeInput)
                        logger.info(`invoice.payment_failed catch case for stripe webhook, ${err}`)
                        logger.error(err)
                        throw err
                    }
                // eslint-disable-next-line no-fallthrough
                default:
                    break
                }
            } else {
                logger.info(`Payments webhook api Failed`)
                return { message: `Don't have type value in stripe input` }
            }
        } catch (err) {
            logger.info(`catch case for payments webhook ${err}`)
            throw err
        }
    }

    static async getPaymentById (paymentId, transaction) {
        const payment = await models.Payment.findOne({
            where: { id: paymentId },
            include: [
                {
                    model: models.AgreementPerson,
                    required: false,
                    include: [
                        {
                            model: models.Person,
                            as: 'person',
                            attributes: ['firstName', 'middleName', 'lastName', 'email'],
                            required: true
                        }
                    ]
                },
                {
                    model: models.Partners.scope('defaultIncludes')
                },
                {
                    model: models.Agreement,
                    required: true,
                    include: [{
                        model: models.AgreementPerson,
                        attributes: ['isOwner', 'id', 'roleId'],
                        as: 'beneficiary',
                        required: false,
                        include: [
                            {
                                model: models.AgreementRole,
                                as: 'agreementRole',
                                required: true,
                                where: { name: 'Beneficiary' }
                            },
                            {
                                model: models.Person,
                                as: 'person',
                                attributes: ['id'],
                                include: [{
                                    model: models.PersonVerificationDetails,
                                    as: 'personVerificationDetails',
                                    attributes: ['onePortalId']
                                }]
                            }]
                    },
                    {
                        model: models.Location,
                        as: 'location',
                        required: false,
                        attributes: ['id', 'name', 'tax', 'phoneNumber', 'code'],
                        include: [{
                            model: models.Place,
                            as: 'place',
                            include: [{
                                model: models.Address,
                                as: 'address'
                            }]
                        }]
                    }]
                },
                {
                    model: models.Addendum
                }
            ],
            transaction
        })
        return payment
    }

    static async voidPayment (payload, user, receivedTransaction = false, migratedVoidPayment = false) {
        let transaction = receivedTransaction || await models.sequelize.transaction()
        try {
            rollbar.info('void_Payment_start', payload, user, new Date())
            logger.info(`void_Payment_start`)
            const payment = await this.getPaymentById(payload.id)
            if (!payment) {
                throw new Error('PAYMENT_NOT_FOUND')
            }
            if ((payment && payment.status === 'success') || migratedVoidPayment) {
                const voidedPayment = await upsert('Payment', payload, transaction)
                await models.Agreement.updateTotalPaidAndDue(payment.resourceId, user.id, transaction)
                rollbar.info('void_Payment_after_paid_update_db', voidedPayment, new Date())
                logger.info(`void_Payment_after_paid_update_db`)
                if (!migratedVoidPayment) {
                    // Send Email to Payer, loggedin user and accounts team
                    const payer = payment.Partner ? payment.Partner.contact : payment.AgreementPerson ? payment.AgreementPerson.person : null
                    const partnerName = payment.Partner ? payment.Partner.partnerName : null
                    const payerEmail = payer ? payer.email : null
                    const userEmail = user.email
                    if (payerEmail || userEmail) {
                        let to = [payerEmail, userEmail].join(',')
                        const cc = process.env.NODE_ENV === 'preproduction'
                            ? ['w@gmail.com', 'a@gmail.com'] : process.env.NODE_ENV === 'production'
                                ? ['a@gmail.com'] : ['w@gmail.com']
                        // const agreement = await models.Agreement.findOne({ where: { id: payment.resourceId } })
                        const contractNo = payment.Addendum ? payment.Addendum.addendumNumber.trim() : payment.Agreement.contractNumber.trim()
                        let payerName = partnerName || (payer ? [payer.firstName, payer.middleName, payer.lastName].join(' ').trim() : '')
                        const benificiaryOPIs = payment.Agreement.beneficiary.map(b => b.person.personVerificationDetails.onePortalId).join(', ')
                        const paymentOtherInfo = payment.otherInfo ? JSON.parse(payment.otherInfo) : {}
                        const paymentType = PaymentTypes[payment.paymentType] === 'Card' ? (paymentOtherInfo ? (paymentOtherInfo.cardType ? `${paymentOtherInfo.cardType} card` : 'card') : 'card') : PaymentTypes[payment.paymentType]
                        if (payload.voidType === 'PNF AN Before Submit' || payload.voidType === 'Payment Reconciliation') {
                            to = userEmail
                            payerName = user.name
                        }
                        const { queueNames, queues } = require('../../../appQueues')
                        const emailWorker = queues[queueNames.email_queue]
                        const voidPaymentEmailData = {
                            to,
                            contractNo,
                            payerName,
                            benificiaryOPIs,
                            amount: Number.parseFloat(payment.amount).toFixed(2),
                            paymentType,
                            referenceNumber: payment.receiptNumber || payment.referenceNumber,
                            voidedRemarks: payload.voidedRemarks,
                            cc
                        }
                        emailWorker.add('VoidPaymentEmail', voidPaymentEmailData)
                        rollbar.info('void Payment Email', voidPaymentEmailData, new Date())
                    }
                }
                rollbar.info('void Payment', payload)
                if (!receivedTransaction) transaction.commit()
                return voidedPayment
            } else {
                throw new Error('FAILED_PAYMENTS_CANNOT_BE_VOIDED')
            }
        } catch (error) {
            if (!receivedTransaction) transaction.rollback()
            rollbar.error('void_payment_error', error, payload)
            throw error
        }
    }

    /**
     * This method returns the balance amount for validating the paying amount
     * @param {*} agreementId is the id of Agreement
     * @param {*} balance is the present due
     * @param {*} transaction
     */
    async getRemainingDue (agreementId, balance, transaction) {
        const FinanceController = require('./../financeController/financeOptionController')
        const financeController = new FinanceController(agreementId)
        const agreementFinance = await financeController.getAgreementFinance(false, transaction)
        let balanceAmount = balance
        if (balanceAmount && agreementFinance && agreementFinance.remainingBalance) {
            const agreementFinanceSchedule = await financeController.getPresentFinanceSchedule(agreementFinance.id, transaction)
            const remainingFC = agreementFinance.remainingInterest
            // Get first EMI date
            // If current date is less than first EMI date, then finance charge should be deducted from balance
            let firstEMIDate = await financeController.getFirstEMIDate(agreementFinance.id, transaction)
            const currentDate = moment().toISOString()
            firstEMIDate = moment(firstEMIDate).toISOString()
            if (!agreementFinanceSchedule && currentDate < firstEMIDate) {
                balanceAmount -= remainingFC
            } else {
                let defaultInterestAmount = await financeController.getDefaultedInterestAmountDetails(agreementFinance, false, transaction)

                // The cumulative defaulted interest amount
                let defaultedInterest = 0

                if (defaultInterestAmount.length) {
                    for (let defaultedDetails in defaultInterestAmount) {
                        defaultedInterest += defaultInterestAmount[defaultedDetails].needToPay
                    }
                }

                // const emiInterest = agreementFinanceSchedule.interest
                // const totalPaidEMI = await financeController.getTotalPaidForEMI(agreementFinanceSchedule.id, transaction)
                let remInterest = agreementFinanceSchedule.remainingInterestToBePaid
                balanceAmount = remInterest <= 0 ? balanceAmount - remainingFC : (balanceAmount - remainingFC) + remInterest + defaultedInterest
            }
        }
        return balanceAmount.toFixed(2)
    }
    async refreshPayment (payload) {
        try {
            const paymentId = payload.id
            let payment = await models.Payment.findOne({
                where: {
                    id: paymentId
                }
            })
            if (!payment) {
                throw new Error('PAYMENT_NOT_FOUND')
            } else {
                const webHookEventId = payment.webHookEventId
                const eventInfo = await stripeClient.retrieveWebHookRequestBodyByEventId(webHookEventId)
                let metaDataObj = _.get(eventInfo, 'data.object.metadata', {})
                let payorId = metaDataObj.payorId
                if (metaDataObj.partnerId) {
                    payorId = metaDataObj.partnerId
                }
                const payorController = new PayorController(payorId)
                payorController.setResource(metaDataObj.resourceId)
                const paymentResponse = await payorController.stripeWebhookHandler(eventInfo, metaDataObj.currentUserId)
                return paymentResponse
            }
        } catch (error) {
            rollbar.info('refreshPayment', error)
            throw error
        }
    }
}
module.exports = PayorController
