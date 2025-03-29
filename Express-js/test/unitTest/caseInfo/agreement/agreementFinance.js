const chai = require('chai')
const faker = require('faker')
const moment = require('moment')
const { financeSchema, personSchema, agreementSchema } = require('../../schema')
const models = require('../../../../models/index')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const AddendumController = require('../../../../controllers/refactorControllers/agreementController/addendum')
const PayorController = require('../../../../controllers/refactorControllers/paymentController/payerController')
const AgreementItemController = require('../../../../controllers/refactorControllers/agreementController/agreementItemController')
const VerifiedPersonController = require('../../../../controllers/refactorControllers/personController/verifiedPersonController')
const PersonController = require('../../../../controllers/refactorControllers/personController/personController')
const expect = chai.expect
const chaiAsPromised = require('chai-as-promised')
const FinanceController = require('../../../../controllers/refactorControllers/financeController/financeOptionController')
const {
    updateAgreementDetails
} = require('../../../../controllers/refactorControllers/agreementController/agreementUtils')
const {
    getAgreementRoles
} = require('../../../../controllers/refactorControllers/utils')
chai.use(chaiAsPromised);
chai.should();

const returnAgreementDetails = (agreementId) => {
    const agreementController = new AgreementController(agreementId)
    return agreementController.getAgreementDetails()
}

async function createArrangementItem(agreementId, locationId) {
    const itemTypes = await models.ItemType.findAll({
        where: {
            name: ['Services', 'Merchandises']
        },
        raw: true
    })
    let itemTypesIds = itemTypes.map(itemType => itemType.id)
    let items = await models.LocationItem.findAll({
        where: {
            locationId: locationId
        },
        include: [{
            model: models.Item,
            include: [{
                model: models.ItemCategory,
                where: {
                    itemTypeId: itemTypesIds
                }
            }],
            required: true
        }],
        raw: true,
        order: [
            ['price', 'DESC']
        ],
        limit: 2
    })
    const agreementItemController = new AgreementItemController(agreementId)
    await agreementItemController.createOrUpdate('add', {
        locationItemId: items[0].id,
        timezone: 'Asia/Calcutta',
        userId: 1
    })
    await agreementItemController.createOrUpdate('add', {
        locationItemId: items[1].id,
        timezone: 'Asia/Calcutta',
        userId: 1
    })
}


describe('financing option list', () => {
    it('should list all the financing options', async () => {
        const financeOptions = await FinanceController.listFinancingOptions()
        financeOptions.should.have.lengthOf(3)
    })
})

describe('calculate repayment schedule', () => {
    let agreementId, paymentSchema, agreementObject
    before(async () => {
        let agreementRoles = await getAgreementRoles('map')
        const person = {
            ...personSchema()
        }
        const createdPerson =
            await PersonController.createOrUpdate(person, {}, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)
        await verifiedPersonController.createArrangement()
        agreementObject = {
            ...agreementSchema(createdPerson.isAlive),
            type: 1,
        }
        agreementObject.persons = [{
            'agreementRoleId': agreementRoles['Beneficiary'],
            'personId': createdPerson.id
        }, {
            'agreementRoleId': agreementRoles['Purchaser'],
            'personId': createdPerson.id
        }]
        const agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementObject)
        agreementId = agreement.id
        await updateAgreementDetails(agreementId, createdPerson.id)
        await createArrangementItem(agreementId, agreementObject.locationId)
        agreementItemController = new AgreementItemController(agreementId)
        const agreementController = new AgreementController(agreementId)
        const payorDetails = await agreementController.addPayor({
            person: {
                personId: createdPerson.id
            }
        })
        paymentSchema = {
            resourceId: agreementId,
            amount: 10,
            paymentType: 1,
            referenceType: 'Agreement',
            payorId: payorDetails.id
        }
    })
    it('should result into listing of schedule table of emi', async () => {
        const financePayload = financeSchema()
        delete financePayload.paymentsPerYear
        const schedule = await FinanceController.calculateRepaymentSchedule(financePayload)
        const sum = schedule.interestSum + schedule.principalSum
        schedule.should.have.property('sum').and.equal(Math.round(sum * 100) / 100)
        schedule.should.have.property('installments')
    })

    it('should result into listing of schedule table with paymentPerYear', async () => {
        const financePayload = financeSchema()
        financePayload.paymentsPerYear = 2
        financePayload.tenureMonths = 12
        const schedule = await FinanceController.calculateRepaymentSchedule(financePayload)
        const sum = schedule.interestSum + schedule.principalSum
        schedule.should.have.property('sum').and.equal(Math.round(sum * 100) / 100)
        schedule.installments.forEach((eachInstallment, index) => {
            const expectedPaymentDate = moment(eachInstallment.expectedPaymentDate).format('L')
            expectedPaymentDate.should.equal(moment().add((index + 1) * 6, 'month').format('L'))
        })
    })

    it('should result into listing of schedule table with paymentStartDate', async () => {
        const financePayload = financeSchema()
        financePayload.paymentsPerYear = 2
        financePayload.tenureMonths = 12
        financePayload.paymentStartDate = moment().add(1, 'month').format()
        const schedule = await FinanceController.calculateRepaymentSchedule(financePayload)
        const sum = schedule.interestSum + schedule.principalSum
        schedule.should.have.property('sum').and.equal(Math.round(sum * 100) / 100)
        moment(schedule.installments[0].expectedPaymentDate).format('L').should.equal(moment(financePayload.paymentStartDate).format('L'))
        moment(schedule.installments[1].expectedPaymentDate).format('L').should.equal(moment().add(7, 'months').format('L'))
    })
})

describe('finalize finance', () => {
    let agreementId, tenureMonths, paymentSchema, agreementObject
    before(async () => {
        let agreementRoles = await getAgreementRoles('map')
        const person = {
            ...personSchema()
        }
        const createdPerson =
            await PersonController.createOrUpdate(person, {}, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)
        await verifiedPersonController.createArrangement()
        agreementObject = {
            ...agreementSchema(createdPerson.isAlive),
            type: 1,
        }
        agreementObject.persons = [{
            'agreementRoleId': agreementRoles['Beneficiary'],
            'personId': createdPerson.id
        }, {
            'agreementRoleId': agreementRoles['Purchaser'],
            'personId': createdPerson.id
        }]
        const agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementObject)
        agreementId = agreement.id
        await updateAgreementDetails(agreementId, createdPerson.id)
        await createArrangementItem(agreementId, agreementObject.locationId)
        agreementItemController = new AgreementItemController(agreementId)
        const agreementController = new AgreementController(agreementId)
        const payorDetails = await agreementController.addPayor({
            person: {
                personId: createdPerson.id
            }
        })
        paymentSchema = {
            resourceId: agreementId,
            amount: 10,
            paymentType: 1,
            referenceType: 'Agreement',
            payorId: payorDetails.id
        }
    })

    it('should throw error when finalizing the finance without agreement', async () => {
        const financeController = new FinanceController(faker.random.number({
            min: agreementId + 1
        }))
        await expect(financeController.finalizeFinance()).to.be.rejectedWith(Error, 'AGREEMENT_NOT_FOUND')
    })

    it('should successfully finalize finance', async () => {
        const financeController = new FinanceController(agreementId)
        const financePayload = financeSchema()
        delete financePayload.paymentsPerYear
        const agreementDetails = await financeController.finalizeFinance(financePayload)
        agreementDetails.should.have.property('id')
        tenureMonths = agreementDetails.tenureMonths
    })

    it('should throw error, agreement can have at max one finance only', async () => {
        const financeController = new FinanceController(agreementId)
        const financePayload = financeSchema()
        await expect(financeController.finalizeFinance(financePayload)).to.be.rejectedWith(Error, 'AT_MOST_ONE_AGREEMENT_FINANCE')
    })

    it('should create a payment reference and update remainingBalance', async () => {
        paymentSchema.amount = 10
        const financeController = new FinanceController(agreementId)
        const agreementDetailsBeforePayment = await financeController.getAgreementFinance(false)
        const agreementFinanceSchedule = await models.AgreementFinanceSchedule.findAll({
            where: {
                agreementFinanceId: agreementDetailsBeforePayment.id
            }
        })
        agreementFinanceSchedule.map(async eachAgreementFinanceSchedule => {
            eachAgreementFinanceSchedule.expectedPaymentDate = moment(eachAgreementFinanceSchedule.expectedPaymentDate)
                .subtract(1, 'months').subtract(15, 'day').format()
            eachAgreementFinanceSchedule = await eachAgreementFinanceSchedule.save()
            return eachAgreementFinanceSchedule
        })
        const payerController = new PayorController(paymentSchema.payorId)
        payerController.setResource(paymentSchema.resourceId)
        const payment = await payerController.createCashPayment(paymentSchema)
        const agreementDetails = await financeController.getAgreementFinance(false)
        agreementDetails.should.have.property('id')
        const agreementFinanceSchedulePayment = await models.AgreementFinanceSchedulePayment.findOne({
            where: {
                paymentId: payment.id
            }
        })
        agreementFinanceSchedulePayment.should.have.property('id')
    })

    it('should create a card payment reference and update remainingBalance', async () => {
        let cardPayment = {
            payorId: paymentSchema.payorId,
            resourceId: paymentSchema.resourceId,
            resourceType: "Agreement",
            amount: 10,
            cardId: "",
            remarks: "pay",
            receiptUrl: "receiptUrl",
            emailUrl: "emailUrl",
        }
        const financeController = new FinanceController(agreementId)
        const payerController = new PayorController(paymentSchema.payorId)
        payerController.setResource(paymentSchema.resourceId)
        const addCardResponse = await payerController.addCard('tok_visa')
        cardPayment.cardId = addCardResponse.id
        paymentResponse = await payerController.cardPayment(cardPayment, {
            id: 1
        })
        paymentResponse.should.have.property('amount').and.to.be.equal(cardPayment.amount)
        const agreementDetails = await financeController.getAgreementFinance(false)
        agreementDetails.should.have.property('id')
        const agreementFinanceSchedulePayment = await models.AgreementFinanceSchedulePayment.findOne({
            where: {
                paymentId: paymentResponse.id
            }
        })
        agreementFinanceSchedulePayment.should.have.property('id')
    })

    it('should give finance details in the cart api', async () => {
        const payerController = new PayorController(paymentSchema.payorId)
        const financeController = new FinanceController(agreementId)
        const financeDetails = await financeController.getAgreementFinance(false)
        payerController.setResource(paymentSchema.resourceId)
        const cartValues = await payerController.getCartDetails()
        cartValues.should.have.property('finances')
        cartValues.finances.should.to.be.an('array').of.length(1)
        cartValues.finances[0].should.have.property('financedAmount').and.equal(financeDetails.financedAmount)
        cartValues.finances[0].should.have.property('interestAmount').and.equal(financeDetails.interestAmount)
        cartValues.finances[0].should.have.property('totalAmount').and.equal(financeDetails.totalAmount)
        cartValues.should.have.property('totalSalesPrice').and.equal(`${(cartValues.totalCashPrice + financeDetails.interestAmount).toFixed(2)}`)
    })
})

describe('special financing uneven payment', () => {
    let agreementId, paymentSchema
    before(async () => {
        let agreementRoles = await getAgreementRoles('map')
        const person = {
            ...personSchema()
        }
        const createdPerson =
            await PersonController.createOrUpdate(person, {}, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)
        await verifiedPersonController.createArrangement()
        const agreementObject = {
            ...agreementSchema(createdPerson.isAlive),
            type: 1,
        }
        agreementObject.persons = [{
            'agreementRoleId': agreementRoles['Beneficiary'],
            'personId': createdPerson.id
        }, {
            'agreementRoleId': agreementRoles['Purchaser'],
            'personId': createdPerson.id
        }]
        const agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementObject)
        agreementId = agreement.id
        await updateAgreementDetails(agreementId, createdPerson.id)
        await createArrangementItem(agreementId, agreementObject.locationId)
        agreementItemController = new AgreementItemController(agreementId)
        const agreementController = new AgreementController(agreementId)
        const payorDetails = await agreementController.addPayor({
            person: {
                personId: createdPerson.id
            }
        })
        paymentSchema = {
            resourceId: agreementId,
            amount: 10,
            paymentType: 1,
            referenceType: 'Agreement',
            payorId: payorDetails.id
        }
    })
    it('should successfully create a special finance for uneven payment', async () => {
        const financePayload = {
            "totalAmount": 60000,
            "financedAmount": 50000,
            "downPaymentAmount": 10000,
            "isUnequal": true,
            "tenureMonths": 10,
            "interestRate": 4.8,
            "interestAmount": 5000,
            "paymentPerYear": 6,
            "paymentStartDate": "2020-05-13T10:41:08.561Z",
            "paymentEndDate": "2020-05-13T10:41:08.561Z",
            "installments": [{
                    "paymentIndex": 1,
                    "expectedPaymentDate": "2020-05-13T10:41:08.561Z",
                    "expectedPaymentAmount": 25000
                },
                {
                    "paymentIndex": 2,
                    "expectedPaymentDate": "2020-05-13T10:41:08.561Z",
                    "expectedPaymentAmount": 30000
                }
            ],
            currentUser: {
                id: 1
            }
        }
        const financeController = new FinanceController(agreementId)
        const specialFinance = await financeController.specialFinance(financePayload)
        specialFinance.should.have.property('id')
        specialFinance.should.have.property('financeType').and.equal('Special-unequal')
        specialFinance.should.have.property('status').and.equal('Pending')
    })

    it('should throw error when tried for special finance again', async () => {
        const financeController = new FinanceController(agreementId)
        const financePayload = financeSchema()
        await expect(financeController.specialFinance(financePayload)).to.be.rejectedWith(Error, 'AT_MOST_ONE_AGREEMENT_FINANCE')
        await financeController.revokeFinance()
    })
})

describe('special financing even payments', () => {
    let agreementId, paymentSchema
    before(async () => {
        let agreementRoles = await getAgreementRoles('map')
        const person = {
            ...personSchema()
        }
        const createdPerson =
            await PersonController.createOrUpdate(person, {}, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)
        await verifiedPersonController.createArrangement()
        const agreementObject = {
            ...agreementSchema(createdPerson.isAlive),
            type: 1,
        }
        agreementObject.persons = [{
            'agreementRoleId': agreementRoles['Beneficiary'],
            'personId': createdPerson.id
        }, {
            'agreementRoleId': agreementRoles['Purchaser'],
            'personId': createdPerson.id
        }]
        const agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementObject)
        agreementId = agreement.id
        await updateAgreementDetails(agreementId, createdPerson.id)
        await createArrangementItem(agreementId, agreementObject.locationId)
        agreementItemController = new AgreementItemController(agreementId)
        const agreementController = new AgreementController(agreementId)
        const payorDetails = await agreementController.addPayor({
            person: {
                personId: createdPerson.id
            }
        })
        paymentSchema = {
            resourceId: agreementId,
            amount: 10,
            paymentType: 1,
            referenceType: 'Agreement',
            payorId: payorDetails.id
        }
    })
    it('should successfully create a special finance with even payments', async () => {
        const financeController = new FinanceController(agreementId)
        const financePayload = financeSchema()
        const specialFinance = await financeController.specialFinance({
            ...financePayload,
            financedAmount: financePayload.totalPrincipal,
            isUnequal: false
        })
        specialFinance.should.have.property('id')
        specialFinance.should.have.property('financeType').and.equal('Special-equal')
        specialFinance.should.have.property('status').and.equal('Pending')
    })

    it('should throw error when tried for special finance again', async () => {
        const financeController = new FinanceController(agreementId)
        const financePayload = financeSchema()
        await expect(financeController.specialFinance(financePayload)).to.be.rejectedWith(Error, 'AT_MOST_ONE_AGREEMENT_FINANCE')
        await financeController.revokeFinance()
    })
})


describe('refinancing finance, new Principal and revoke finance', () => {
    let merchandise, agreementId, tenureMonths
    before(async () => {
        let agreementRoles = await getAgreementRoles('map')
        const person = {
            ...personSchema()
        }
        const createdPerson = await PersonController.createOrUpdate(person, {}, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)
        await verifiedPersonController.createArrangement()
        const agreementObject = {
            ...agreementSchema(createdPerson.isAlive),
            type: 1,
        }
        agreementObject.persons = [{
            'agreementRoleId': agreementRoles['Beneficiary'],
            'personId': createdPerson.id
        }, {
            'agreementRoleId': agreementRoles['Purchaser'],
            'personId': createdPerson.id
        }]
        const agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementObject)
        agreementId = agreement.id
        await updateAgreementDetails(agreementId, createdPerson.id)
        await createArrangementItem(agreementId, agreementObject.locationId)
        let agreementItemController = new AgreementItemController(agreementId)
        const agreementController = new AgreementController(agreementId)
        const payorDetails = await agreementController.addPayor({
            person: {
                personId: createdPerson.id
            }
        })
        paymentSchema = {
            resourceId: agreementId,
            amount: 10,
            paymentType: 1,
            referenceType: 'Agreement',
            payorId: payorDetails.id
        }
        const addendumController = new AddendumController(agreementId)
        await agreementController.markAgreementComplete()
        const addendum = await addendumController.createAddendum()
        addendumId = addendum.id

        const merchandiseItemType = await models.ItemType.findOne({
            where: {
                name: 'Merchandises'
            }
        })
        merchandise = await models.LocationItem.findOne({
            where: {
                locationId: agreementObject.locationId
            },
            include: [{
                model: models.Item,
                include: [{
                    model: models.ItemCategory,
                    where: {
                        itemTypeId: merchandiseItemType.id
                    }
                }],
                required: true
            }]
        })
        await agreementItemController.createOrUpdate('add', {
            itemType: 'locationItem',
            locationItemId: merchandise.id,
            addendumId,
            timezone: 'Asia/Calcutta'
        })
        const financeController = new FinanceController(agreementId)
        const financePayload = financeSchema()
        let agreemnetDetails = await returnAgreementDetails(agreementId)
        financePayload.totalPrincipal = agreemnetDetails.totalPurchasePrice
        const agreementDetails = await financeController.finalizeFinance(financePayload)
        agreementDetails.should.have.property('id')
        tenureMonths = agreementDetails.tenureMonths
    })

    it('should throw error when refinancing without addendum', async () => {
        const financeController = new FinanceController(agreementId)
        await expect(financeController.refinancing({})).to.be.rejectedWith(Error, 'ADDENDUM_NOT_FOUND')
    })
    it('should throw error when tenure month is greater than original tenure', async () => {
        const financeController = new FinanceController(agreementId, addendumId)
        await expect(financeController.refinancing({
            tenureMonths: faker.random.number({
                min: 73
            })
        })).to.be.rejectedWith(Error, 'INCORRECT_TENURE_REFINANCING')
    })
    it('should create a refinancing successfully', async () => {
        const financeController = new FinanceController(agreementId, addendumId)
        const financeDetails = await financeController.getAgreementFinance()
        const newBalance = financeDetails.remainingBalance + merchandise.price
        const refinancing = await financeController.refinancing({
            tenureMonths,
            totalPrincipal: newBalance,
            currentUser: {
                id: 1
            }
        })
        refinancing.should.have.property('id')
        refinancing.should.have.property('remainingBalance').and.equal(newBalance)
        refinancing.should.have.property('financedAmount').and.equal(newBalance)
    })

    it('should able to call the current new principal', async () => {
        const financeController = new FinanceController(agreementId, addendumId)
        const financeDetails = await financeController.getAgreementFinance()
        const newBalance = financeDetails.remainingBalance + merchandise.price
        const newPrincipal = await financeController.changedPrincipal()
        newPrincipal.should.equal(newBalance)
    })

    it('should give re-finance details in the cart api', async () => {
        const payerController = new PayorController(paymentSchema.payorId)
        const financeController = new FinanceController(agreementId)
        const financeDetails = await financeController.getAgreementFinance(false)
        payerController.setResource(paymentSchema.resourceId)
        const cartValues = await payerController.getCartDetails()
        cartValues.finances.should.to.be.an('array')
        cartValues.finances[0].should.have.property('financedAmount').and.equal(financeDetails.financedAmount)
        cartValues.finances[0].should.have.property('interestAmount').and.equal(financeDetails.interestAmount)
        cartValues.finances[0].should.have.property('totalAmount').and.equal(financeDetails.totalAmount)
        cartValues.should.have.property('totalSalesPrice').and.equal(`${(cartValues.totalCashPrice + financeDetails.interestAmount).toFixed(2)}`)
    })

    it('should successfully revoke finance', async () => {
        const financeController = new FinanceController(agreementId, addendumId)
        const revokedFinance = await financeController.revokeFinance()
        revokedFinance.should.have.property('id')
        revokedFinance.should.have.property('isActive').and.equal(false)
    })

    it('should throw error when trying to refinance when there is no finance', async () => {
        const financeController = new FinanceController(agreementId, addendumId)
        await expect(financeController.refinancing({
            tenureMonths
        })).to.be.rejectedWith(Error, 'AGREEMENT_FINANCE_NOT_FOUND')
    })
})