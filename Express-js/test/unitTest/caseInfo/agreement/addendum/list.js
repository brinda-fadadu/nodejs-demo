const chai = require('chai')
const faker = require('faker')
const chaiAsPromised = require('chai-as-promised')
const { personSchema, agreementSchema } = require('../../../schema')
const VerifiedPersonController = require('../../../../../controllers/refactorControllers/personController/verifiedPersonController')
const PersonController = require('../../../../../controllers/refactorControllers/personController/personController')
const AgreementController = require('../../../../../controllers/refactorControllers/agreementController/agreementController')
const AddendumController = require('../../../../../controllers/refactorControllers/agreementController/addendum')
chai.use(chaiAsPromised);
const expect = chai.expect
chai.should();

let agreementId

describe('addendum list', () => {
    before(async () => {
        const createdPerson = await PersonController.createOrUpdate({ ...personSchema() }, {}, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)
        await verifiedPersonController.createArrangement()
        const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementType = 1, createdPerson.isAlive ? 1: 2 )
        const saleTypeIds = saleTypes.map(saleType => saleType.id)
        const agreementObject = {
            ...agreementSchema(createdPerson.isAlive),
            type: 1,
            saleTypeId: faker.random.arrayElement(saleTypeIds)
        }
        const agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementObject)
        agreementId = agreement.id
    })

    it('should throw error when there is random agreementId', async () => {
        const addendumController = new AddendumController(faker.random.number({ min: 1000 }))
        await expect( addendumController.getAllAddendum()).to.be.rejectedWith(Error, 'AGREEMENT_NOT_FOUND')
    })

    it('should throw error when agreement is in progress status', async () => {
        const addendumController = new AddendumController(agreementId)
        await expect( addendumController.getAllAddendum()).to.be.rejectedWith(Error, 'AGREEMENT_IS_NOT_COMPLETED')
    })
    
    it('should list addendum successfully', async () => {
        const addendumController = new AddendumController(agreementId)
        const agreementController = new AgreementController(agreementId)
        await agreementController.markAgreementComplete()
        await addendumController.createAddendum()
        const result = await addendumController.getAllAddendum()
        result.addendumList.length.should.be.greaterThan(0)
        result.addendumList.forEach((eachAddendum, index) => {
            eachAddendum.addendumNumber.should.equal(`${result.agreementDetails.contractNumber}-${('0' + (index + 1)).slice(-2)}`)
        })
    })
})

describe('addendum details', () => {
    before(async () => {
        const createdPerson = await PersonController.createOrUpdate({ ...personSchema() }, {}, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)
        await verifiedPersonController.createArrangement()
        const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementType = 1, createdPerson.isAlive ? 1: 2 )
        const saleTypeIds = saleTypes.map(saleType => saleType.id)
        const agreementObject = {
            ...agreementSchema(createdPerson.isAlive),
            type: 1,
            saleTypeId: faker.random.arrayElement(saleTypeIds)
        }
        const agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementObject)
        agreementId = agreement.id
    })

    it('should throw error when there is random agreementId', async () => {
        const addendumController = new AddendumController(faker.random.number({ min: 1000 }))
        await expect( addendumController.getAddendumDetails()).to.be.rejectedWith(Error, 'AGREEMENT_NOT_FOUND')
    })

    it('should throw error when agreement is in progress status', async () => {
        const addendumController = new AddendumController(agreementId)
        await expect( addendumController.getAddendumDetails()).to.be.rejectedWith(Error, 'AGREEMENT_IS_NOT_COMPLETED')
    })

    it('should throw error when there is random addendumId', async () => {
        const agreementController = new AgreementController(agreementId)
        await agreementController.markAgreementComplete()
        const addendumController = new AddendumController(agreementId, faker.random.number({ min: 1000 }))
        await expect( addendumController.getAddendumDetails()).to.be.rejectedWith(Error, 'ADDENDUM_NOT_FOUND')
    })
    
    it('should list addendum successfully', async () => {
        const addendumController = new AddendumController(agreementId)
        const createdAddendum = await addendumController.createAddendum()
        addendumController.addendumId = createdAddendum.id
        const result = await addendumController.getAddendumDetails()
        result.should.have.property('id').and.equal(createdAddendum.id)
    })
})