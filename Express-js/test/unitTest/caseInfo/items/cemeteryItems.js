const chai = require('chai')
const faker = require('faker')
const expect = chai.expect
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised);
chai.should();

const { personSchema, agreementSchema } = require('../../schema')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const VerifiedPersonController  = require('../../../../controllers/refactorControllers/personController/verifiedPersonController')
const PersonController = require('../../../../controllers/refactorControllers/personController/personController')
const CemeteryItemController = require('../../../../controllers/refactorControllers/itemController/cemeteryItemController')
const AgreementPropertyController = require('../../../../controllers/refactorControllers/agreementController/agreementPropertiesController')
const PropertyController = require('../../../../controllers/refactorControllers/agreementController/agreementPropertiesController')

describe('Agreement Memorial Item', () => {
    let agreementId
    before(async () => {
        const person = { ...personSchema() }
        createdPerson = await PersonController.createOrUpdate(person, {}, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)
        await verifiedPersonController.createArrangement()
        const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementType=1, createdPerson.isAlive ? 1: 2 )
        saleTypeIds = saleTypes.map(saleType => saleType.id)
        const agreementObject = {
            ...agreementSchema(createdPerson.isAlive),
            arrangerId: 1,
            type: 2,
            saleTypeId: null,
            locationId: 2
        }
        const agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementObject)
        agreementId = agreement.id
        agreementPropertyController = new AgreementPropertyController(agreementId)
        propertyController = new PropertyController(agreementId)
        await agreementPropertyController.reserveProperty(399, createdPerson, 'reserved')
        await agreementPropertyController.confirmProperty(399, 'confirmed', createdPerson)
        cemeteryItemController = new CemeteryItemController(agreementId)
    })

    it('should throw an error when fetching memorial categories that does not have agreement', async () => {
        const cemeteryItemController = new CemeteryItemController(faker.random.number({ min: 10000 }))
        await expect(cemeteryItemController.getMemorialCategories()).to.be.rejectedWith(Error, 'AGREEMENT_NOT_FOUND')
    })

    it('should fetch memorial categories', async () => {
        let res = await cemeteryItemController.getMemorialCategories()
        res.should.have.property('success').and.to.be.equal(true);
        res.should.have.property('data').and.to.be.an('array');
    })

    it('should fetch monument items', async () => {
        let memorialTypeId = 277
        let memorialSizeIds = [22]
        let res = await CemeteryItemController.getMonumentItems(memorialTypeId, memorialSizeIds, agreementId)
        res.should.have.property('success').and.to.be.equal(true);
        res.should.have.property('data').and.to.be.an('array');
    })

    it('should fetch memorials items', async () => {
        let monumentItemId = 5050
        let res = await CemeteryItemController.getMemorialItems(monumentItemId, agreementId)
        res.should.have.property('success').and.to.be.equal(true);
        res.should.have.property('data').and.to.be.an('object');
    })

    after(async () => {
        await propertyController.releaseProperty(399)
    })
})
