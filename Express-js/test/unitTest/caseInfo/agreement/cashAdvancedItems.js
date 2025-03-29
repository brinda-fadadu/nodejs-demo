const faker = require('faker')
const models = require('../../../../models')
const {personSchema, addressSchema} = require('../../schema')
const CAIController = require('../../../../controllers/refactorControllers/agreementController/agreementCashAdvanceItemController')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const VerifiedPersonController  = require('../../../../controllers/refactorControllers/personController/verifiedPersonController')
const PersonController = require('../../../../controllers/refactorControllers/personController/personController')
const { findOrCreateUser } = require('../../helper')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
chai.should()

let userId, personId, cashAdvanceItem, cashAdvanceItemId

describe('Agreement Cash Advanced Items Controller Unit Test Cases', () => {
    before(async () => {
        const person = {
            ...personSchema()
        }
        const place= {
            address: {
                ...addressSchema()
            }
        }
        person.isAlive = false
        const createdPerson = await PersonController.createOrUpdate(person, place, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        if(!person.isVerified) {
            await verifiedPersonController.verifyPerson(createdPerson)
        }
        personId = createdPerson.id

        const user = await findOrCreateUser()
        userId = user.id

        await verifiedPersonController.createArrangement(userId)

        agreementSchema = {
            needType: 1,
            type: 1,
            locationId: faker.random.number({ min:1, max: 5})
        }
        const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementSchema.type, createdPerson.isAlive ? 1: 2 )
        saleTypeIds = saleTypes.map(saleType => saleType.id)
        agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)

        const agreement = await AgreementController.createOrEditAgreement(personId, agreementSchema, userId)

        const agreementController = new AgreementController(agreement.id)
        const agreementDetails = await agreementController.getAgreementDetails()

        cashAdvanceItem = {
            quantity: 1,
            price: "10",
            note: "adf",
            locationItemId: 10130,
            agreementId: agreementDetails.id,
            userId: userId,
            timezone: 'Asia/Calcutta'
        }
    })

    let caiController = new CAIController()

    it('should successfully Create Cash Advance Item', async () => {
        result = await caiController.upsertCashAdvanceItem(cashAdvanceItem)
        result.should.have.property('id')
        result.should.have.property('agreementId')
        result.should.have.property('locationItemId')
        result.should.have.property('note')
        result.should.have.property('agreementItemPriceId')
        result.should.have.property('totalPrice')
        result.should.have.property('totalCashPrice')
        result.should.have.property('totalAdjustment')
        result.should.have.property('totalPaid')
        result.should.have.property('totalPurchasePrice')
        result.should.have.property('totalTax')
        result.should.have.property('totalAdjustment')
        result.should.have.property('due')
        result.should.have.property('updatedBy')
        result.should.have.property('updatedAt')
        result.should.have.property('createdBy')
        result.should.have.property('createdAt')
        cashAdvanceItemId = result.id
    })

    it('should successfully Update Cash Advance Item', async () => {
        cashAdvanceItem.id = cashAdvanceItemId
        let result = await caiController._createOrUpdateCAI(cashAdvanceItem)
        result.should.have.property('id')
        result.should.have.property('agreementId')
        result.should.have.property('locationItemId')
        result.should.have.property('note')
        result.should.have.property('agreementItemPriceId')
        result.should.have.property('updatedBy')
        result.should.have.property('updatedAt')
        result.should.have.property('createdBy')
        result.should.have.property('createdAt')
    })

    it('should successfully Get Cash Advance Item', async () => {
        let result = await caiController.getCashAdvanceItem(cashAdvanceItemId)
        result.should.have.property('id')
        result.should.have.property('agreementId')
        result.should.have.property('locationItemId')
        result.should.have.property('note')
        result.should.have.property('agreementItemPriceId')
        result.should.have.property('agreementItemPrice')
        result.should.have.property('updatedBy')
        result.should.have.property('updatedAt')
        result.should.have.property('createdBy')
        result.should.have.property('createdAt')
    })

    it('should successfully Remove Cash Advance Item', async () => {
        let result = await caiController.removeCashAdvanceItem(cashAdvanceItem)
        // result.should.have.property('id')  // id is remove from response of the API
        result.should.have.property('totalPrice')
        result.should.have.property('totalCashPrice')
        result.should.have.property('totalAdjustment')
        result.should.have.property('totalPaid')
        result.should.have.property('totalPurchasePrice')
        result.should.have.property('totalTax')
        result.should.have.property('totalAdjustment')
        result.should.have.property('due')
    })

    after(async () => {
        await models.AgreementCashAdvancedItem.destroy({ where: {} })
        await models.AgreementItemPrice.destroy({ where: {} })
        await models.AgreementPerson.destroy({ where: {} })
        await models.Agreement.destroy({ where: {} })
        await models.Arrangement.destroy({ where: {} })
        await models.PersonVerificationDetails.destroy({ where: {} })
        await models.Person.destroy({ where: {} })
    })

})
