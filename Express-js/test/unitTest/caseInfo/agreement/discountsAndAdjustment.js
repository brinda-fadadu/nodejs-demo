
const chai = require('chai')
const moment = require('moment')
const chaiAsPromised = require('chai-as-promised')
const faker = require('faker')
chai.use(chaiAsPromised);
chai.should();

const { personSchema, agreementSchema, discountSchema, adjustmentSchema } = require('../../schema')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const AdjustmentsController = require('../../../../controllers/refactorControllers/adjustmentController/discountsAndAdjustmentsHandler')
const adjustmentInstance = new AdjustmentsController()
const VerifiedPersonController = require('../../../../controllers/refactorControllers/personController/verifiedPersonController')
const PersonController = require('../../../../controllers/refactorControllers/personController/personController')

describe('Adjustments Controller', () => {
    let listOfAdjustments, appliedFCAAdjustmentId, cemeteryAgreementId
    const startDate = moment().subtract(1, 'days').format('YYYY/MM/DD HH:mm:ss')
    let promocodeInput = {
        description: faker.random.words(),
        code: faker.random.word(),
        agreementType: 3,
        discountUnit: '$',
        maxDiscountValue: 10,
        startDate: startDate,
        title: faker.random.word(),
        endDate: moment(startDate, "YYYY/MM/DD").add('years', 1).format('L'),
        agreementSectionId: [
            1, 2
        ],
        isDisabled: false,
        adjustmentTypeId: 1
    }

    before(async () => {
        const createdPerson = await PersonController.createOrUpdate({ ...personSchema() }, {}, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)
        await verifiedPersonController.createArrangement()
        let saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementType = 1, createdPerson.isAlive ? 1: 2 )
        let saleTypeIds = saleTypes.map(saleType => saleType.id)
        const agreementObject = {
            ...agreementSchema(createdPerson.isAlive),
            type: 1,
            saleTypeId: faker.random.arrayElement(saleTypeIds)
        }
        const agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementObject)
        const agreementController = new AgreementController(agreement.id)
        await agreementController.checkoutAgreement(agreement.id, createdPerson.id)
        agreementId = agreement.id

        saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementType = 2, createdPerson.isAlive ? 1: 2 )
        saleTypeIds = saleTypes.map(saleType => saleType.id)
        const cemeteryAgreementObject = {
            ...agreementSchema(createdPerson.isAlive),
            type: 2,
            saleTypeId: faker.random.arrayElement(saleTypeIds)
        }
        const cemeteryAgreement = await AgreementController.createOrEditAgreement(createdPerson.id, cemeteryAgreementObject)
        const cemeteryAgreementController = new AgreementController(cemeteryAgreement.id)
        await cemeteryAgreementController.checkoutAgreement(cemeteryAgreement.id, createdPerson.id)
        cemeteryAgreementId = cemeteryAgreement.id
    })


    describe('Get list of adjustments', async () => {
        it('Get list of other discounts and adjustments', async () => {
            listOfAdjustments = await AdjustmentsController.getListOfAdjustments({})
            listOfAdjustments.should.be.an('object')
            listOfAdjustments.should.have.property('count').and.to.be.equal(17)
            listOfAdjustments.should.have.property('rows').and.to.be.an('array').of.length(17)
        })
    })

    describe('Create agreement adjustment for other discount and adjustment type adjustments to agreement', async () => {
        it('Apply FCA discount to agreement', async () => {
            const fcaAdjustmentDetails = listOfAdjustments.rows.find(l => { return l.title === 'FCA Discount' })
            const inputData = {
                ...discountSchema(agreementId, fcaAdjustmentDetails.adjustmentTypeId, fcaAdjustmentDetails.id),
                description: 'applying fca discount'
            }
            let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
            appliedAdjustment.should.be.an('object')
            appliedAdjustment.should.have.property('id')
            appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
            appliedAdjustment.should.have.property('agreementId').and.to.be.equal(agreementId)
            appliedAdjustment.should.have.property('agreementAdjustmentDocuments').and.to.be.an('array').of.length(2)
            appliedFCAAdjustmentId = appliedAdjustment.id
        })

        it('Should get error while Apply FCA discount to agreement for second time', async () => {
            try {
                const fcaAdjustmentDetails = listOfAdjustments.rows.find(l => { return l.title === 'FCA Discount' })
                const inputData = {
                    ...discountSchema(agreementId, fcaAdjustmentDetails.adjustmentTypeId, fcaAdjustmentDetails.id),
                    description: 'applying fca discount'
                }
                await adjustmentInstance.createAgreementAdjustment(inputData)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('ADJUSTMENT_ALREADY_APPLIED')
            }
        })

        it('Apply Employee discount to agreement', async () => {
            const employeeAdjustmentDetails = listOfAdjustments.rows.find(l => { return l.title === 'Employee Discount' })
            const inputData = {
                ...discountSchema(agreementId, employeeAdjustmentDetails.adjustmentTypeId, employeeAdjustmentDetails.id),
                description: 'applying fca discount'
            }
            let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
            appliedAdjustment.should.be.an('object')
            appliedAdjustment.should.have.property('id')
            appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
            appliedAdjustment.should.have.property('agreementId').and.to.be.equal(agreementId)
            appliedAdjustment.should.have.property('agreementAdjustmentDocuments').and.to.be.an('array').of.length(2)
        })

        it('Apply Accommodation - Matching discount to agreement', async () => {
            const accMatchingAdjustmentDetails = listOfAdjustments.rows.find(l => { return l.title === 'Accommodation - Matching' })
            const inputData = {
                ...discountSchema(agreementId, accMatchingAdjustmentDetails.adjustmentTypeId, accMatchingAdjustmentDetails.id),
                description: 'applying acc matching discount',
                documents: ['document3', 'document4'],
                requesterName: 'Acc matching discountTestrequester'
            }
            let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
            appliedAdjustment.should.be.an('object')
            appliedAdjustment.should.have.property('id')
            appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
            appliedAdjustment.should.have.property('agreementId').and.to.be.equal(agreementId)
            appliedAdjustment.should.have.property('agreementAdjustmentDocuments').and.to.be.an('array').of.length(2)
        })

        it('Apply Customer Service Refund - Current Year adjustment to agreement', async () => {
            const cusserviceRefundAdjustmentDetails = listOfAdjustments.rows.find(l => { return l.title === 'Customer Service Refund - Current Year' })
            const inputData = {
                ...discountSchema(agreementId, cusserviceRefundAdjustmentDetails.adjustmentTypeId, cusserviceRefundAdjustmentDetails.id),
                description: 'applying cus service discount',
                documents: ['document3', 'document4'],
                requesterName: 'Customer service refund discountTestrequester'
            }
            let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
            appliedAdjustment.should.be.an('object')
            appliedAdjustment.should.have.property('id')
            appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
            appliedAdjustment.should.have.property('agreementId').and.to.be.equal(agreementId)
            appliedAdjustment.should.have.property('agreementAdjustmentDocuments').and.to.be.an('array').of.length(2)
        })

        it('Apply PN Guarantee Allowance to funeral agreement', async () => {
            const pnGuranteeAllowanceDetails = listOfAdjustments.rows.find(l => { return l.title === 'PN Guarantee Allowance Adjustment' })
            const inputData = {
                ...adjustmentSchema(agreementId, pnGuranteeAllowanceDetails.adjustmentTypeId, pnGuranteeAllowanceDetails.id),
                description: 'applying pn gurantee allowance adjustment',
                requesterName: 'PN Guarantee Allowance Adjustment Test Requester'
            }
            let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
            appliedAdjustment.should.be.an('object')
            appliedAdjustment.should.have.property('id')
            appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
            appliedAdjustment.should.have.property('agreementId').and.to.be.equal(agreementId)
            appliedAdjustment.should.have.property('agreementAdjustmentDocuments').and.to.be.an('array').of.length(2)
        })

        it('Apply PN on Cemetery Contract to agreement', async () => {
            const pnCemeteryDetails = listOfAdjustments.rows.find(l => { return l.title === 'PN on Cemetery Contract(s) Adjustment' })
            const inputData = {
                ...adjustmentSchema(agreementId, pnCemeteryDetails.adjustmentTypeId, pnCemeteryDetails.id),
                description: 'applying pn on cemetery contract adjustment',
                requesterName: 'PN on Cemetery Contract(s) Adjustment Test Requester'
            }
            let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
            appliedAdjustment.should.be.an('object')
            appliedAdjustment.should.have.property('id')
            appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
            appliedAdjustment.should.have.property('agreementId').and.to.be.equal(agreementId)
            appliedAdjustment.should.have.property('agreementAdjustmentDocuments').and.to.be.an('array').of.length(2)
        })

        it('Should not apply Paid in Full Discount to funeral agreement', async () => {
            try {
                const paidInFullDetails = listOfAdjustments.rows.find(l => { return l.title === 'Paid in Full Discount' })
                const inputData = {
                    ...discountSchema(cemeteryAgreementId, paidInFullDetails.adjustmentTypeId, paidInFullDetails.id),
                    description: 'applying paid in full discount',
                    requesterName: 'Paid in Full Discount Test Requester'
                }
                await adjustmentInstance.createAgreementAdjustment(inputData)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('AGREEMENT_TYPE_NOT_ALLOWED')
            }
        })

        it('Apply Paid in Full Discount to cemetery agreement', async () => {
            const paidInFullDetails = listOfAdjustments.rows.find(l => { return l.title === 'Paid in Full Discount' })
            const inputData = {
                ...discountSchema(cemeteryAgreementId, paidInFullDetails.adjustmentTypeId, paidInFullDetails.id),
                description: 'applying paid in full discount',
                requesterName: 'Paid in Full Discount Test Requester'
            }
            let appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
            appliedAdjustment.should.be.an('object')
            appliedAdjustment.should.have.property('id')
            appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
            appliedAdjustment.should.have.property('agreementId').and.to.be.equal(cemeteryAgreementId)
            appliedAdjustment.should.have.property('agreementAdjustmentDocuments').and.to.be.an('array').of.length(2)
        })

        it('Should not apply Reinstate Credit Adjustment to funeral agreement', async () => {
            try {
                const reinstateCreditAdjustmentDetails = listOfAdjustments.rows.find(l => { return l.title === 'Reinstate Credit Adjustment' })
                const inputData = {
                    ...adjustmentSchema(agreementId, reinstateCreditAdjustmentDetails.adjustmentTypeId, reinstateCreditAdjustmentDetails.id),
                    description: 'applying reinstate credit adjustment',
                    requesterName: 'Reinstate Credit Adjustment Test Requester'
                }
                await adjustmentInstance.createAgreementAdjustment(inputData)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('AGREEMENT_TYPE_NOT_ALLOWED')
            }
        })

        it('Apply Reinstate Credit Adjustment to cemetery agreement', async () => {
            const reinstateCreditAdjustmentDetails = listOfAdjustments.rows.find(l => { return l.title === 'Reinstate Credit Adjustment' })
            const inputData = {
                ...adjustmentSchema(cemeteryAgreementId, reinstateCreditAdjustmentDetails.adjustmentTypeId, reinstateCreditAdjustmentDetails.id),
                description: 'applying reinstate credit adjustment',
                requesterName: 'Reinstate Credit Adjustment Test Requester'
            }
            const appliedAdjustment = await adjustmentInstance.createAgreementAdjustment(inputData)
            appliedAdjustment.should.be.an('object')
            appliedAdjustment.should.have.property('id')
            appliedAdjustment.should.have.property('adjustmentId').and.to.be.equal(inputData.adjustmentId)
            appliedAdjustment.should.have.property('agreementId').and.to.be.equal(cemeteryAgreementId)
            appliedAdjustment.should.have.property('agreementAdjustmentDocuments').and.to.be.an('array').of.length(2)
        })
    })

    describe('Get list of applied agreement adjustments', async () => {
        it('should return error for agreementId', async () => {
            try {
                await AdjustmentsController.getAgreementAdjustments()
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('AGREEMENT_ID_NOT_FOUND')
            }
        })
        it('Get list of applied agreement adjustments of agreement', async () => {
            const appliedAdjustments = await AdjustmentsController.getAgreementAdjustments(agreementId)
            appliedAdjustments.should.be.an('array')
        })
    })

    describe('Remove applied agreement adjustment from agreement', async () => {
        it('Remove applied adjustment form agreement', async () => {
            const appliedAdjustments = await adjustmentInstance.removeAppliedAgreementAdjustment(appliedFCAAdjustmentId, agreementId, 1)
            appliedAdjustments.should.be.an('array').of.length(1)
        })
    })

    describe('Create Adjustment (promocode)', async () => {
        it('Create adjustment with $ discount type and without discount value', async () => {
            const promocode = await adjustmentInstance.createPromocodeAdjustment({ currentUser: {id: 1}, body: promocodeInput })
            promocode.should.be.an('object')
        })

        it('Should return Promocode already exists error', async () => {
          try {
            await adjustmentInstance.createPromocodeAdjustment({ currentUser: {id: 1}, body: promocodeInput })
          } catch (error) {
            error.should.have.property('message').and.to.be.equal('Promocode already exists and Code must be unique')
          }
        })

        it('Create adjustment with $ discount type and with discount value', async () => {
            promocodeInput.code = faker.random.word()
            promocodeInput.discountValue = 20
            const promocode = await adjustmentInstance.createPromocodeAdjustment({ currentUser: {id: 1}, body: promocodeInput })
            promocode.should.be.an('object')
        })

        it('Create adjustment with % discount type and without discount value', async () => {
            promocodeInput.code = faker.hacker.abbreviation() + '' + faker.random.word()
            promocodeInput.discountUnit = '%'
            const promocode = await adjustmentInstance.createPromocodeAdjustment({ currentUser: {id: 1}, body: promocodeInput })
            promocode.should.be.an('object')
        })

        it('Create adjustment with % discount type and with discount value', async () => {
            promocodeInput.code = faker.random.word()
            promocodeInput.discountValue = 20
            promocodeInput.discountUnit = '%'
            const promocode = await adjustmentInstance.createPromocodeAdjustment({ currentUser: {id: 1}, body: promocodeInput })
            promocode.should.be.an('object')
        })
    })

    describe('Get single promocode details', async() =>{
        let promocode
        before(async() =>{
            promocodeInput.code = faker.random.word()
            promocode = await adjustmentInstance.createPromocodeAdjustment({ currentUser: {id: 1}, body: promocodeInput })
        })

        it('Should return error promocode not found', async () =>{
            try {
                await adjustmentInstance.getPromocodeAdjustment(faker.random.number())
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('NOT_FOUND')
            }
        })

        it('Get details of promocode', async () =>{
            const getPromo = await adjustmentInstance.getPromocodeAdjustment(promocode.id)
            getPromo.should.be.an('object')
        })
    })

    describe('Update Promocode', async() => {
        let createdPromocode
        before(async () =>{
            promocodeInput.code =  faker.hacker.abbreviation()
            createdPromocode = await adjustmentInstance.createPromocodeAdjustment({ currentUser: {id: 1}, body: promocodeInput })
        })
        it('Update created promo', async() =>{
            createdPromocode.title = faker.random.word()
            const updatePromo = await adjustmentInstance.updatePromocodeAdjustment(createdPromocode)
            updatePromo.should.be.an('object')
            updatePromo.should.have.property('title').and.to.be.equal(createdPromocode.title)
        })
    })

    describe('Delete Promocode', async() => {
        let createdPromocode
        before(async () =>{
            promocodeInput.code = faker.random.word()
            createdPromocode = await adjustmentInstance.createPromocodeAdjustment({ currentUser: {id: 1}, body: promocodeInput })
        })
        it('Should return error as record not found', async() =>{
            try {
                await adjustmentInstance.deletePromoAdjustment(faker.random.number(), 1)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('RECORD_NOT_FOUND')
            }
        })
        it('Delete createdPromo', async() =>{
            const deletedPromo = await adjustmentInstance.deletePromoAdjustment(createdPromocode.id, 1)
            deletedPromo.should.be.equal(true)
        })
    })

    describe('Get list of Promocodes', async () => {
        it('Get list of promocodes', async () => {
            const listOfPromoAdjustments = await AdjustmentsController.getListOfAdjustments({ adjustmentType: 'PromoDiscount' })
            listOfPromoAdjustments.should.be.an('object')
            listOfPromoAdjustments.should.have.property('count')
            listOfPromoAdjustments.should.have.property('rows').and.to.be.an('array')
        })
    })
})
