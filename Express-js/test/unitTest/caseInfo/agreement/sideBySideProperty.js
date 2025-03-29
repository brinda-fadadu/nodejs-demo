const faker = require('faker')
const { personSchema } = require('../../schema')
const models = require('../../../../models/index')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const AgreementPropertyController = require('../../../../controllers/refactorControllers/agreementController/agreementPropertiesController')
const SideBySidePropertyController = require('../../../../controllers/refactorControllers/agreementController/sideBySideProperty')
const PersonController = require('../../../../controllers/refactorControllers/personController/personController')
const VerifiedPersonController = require('../../../../controllers/refactorControllers/personController/verifiedPersonController')
const { findOrCreateUser } = require('../../helper')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const expect = chai.expect
chai.should()

const getSaleTypeIds = async (type, createdPerson) => {
    const verifiedPersonController = new VerifiedPersonController(createdPerson.id)

    const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(type, createdPerson.isAlive ? 1: 2 )
    return saleTypes.map(saleType => saleType.id)

}

describe('Side by Side property', () => {
    let createdPerson, agreement, currentUser,rightPropertyData, leftPropertyData, sideBySidePropertyId, payload = {}
    let agreementSchema = {
        needType: 2,
        type: 2,
        locationId: 1
    }

    after(async () => {
        await models.AgreementPropertyAdditionalRight.destroy({ where: {} })
    })

    before(async () => {
        currentUser = await findOrCreateUser()
        const person = { ...personSchema() }
        createdPerson = await PersonController.createOrUpdate(person, {}, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        await verifiedPersonController.verifyPerson(createdPerson)
        await verifiedPersonController.createArrangement()
        const saleTypeIds = await getSaleTypeIds(agreementSchema.type, createdPerson)
        agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)
        agreement = await AgreementController.createOrEditAgreement(createdPerson.id, agreementSchema)
        
        const properties = await models.Property.findAll({
            where: {
                propertyGardenId: 3
            },
            order: models.sequelize.random(),
            limit: 2
        })
        
        rightPropertyData = {
            propertyId: properties[0].id,
            reservationStatus: "reserved",
            resourceType: "Property"
        }
        leftPropertyData = {
            propertyId: properties[1].id,
            reservationStatus: "reserved",
            resourceType: "Property"
        }

        const propertyController = new AgreementPropertyController(agreement.id)
        const rightAgreementProperty = await propertyController.reserveProperty(rightPropertyData.propertyId, currentUser, "reserved")
        const leftAgreementProperty = await propertyController.reserveProperty(leftPropertyData.propertyId, currentUser, "reserved")
        payload.rightAgreementPropertyId = rightAgreementProperty.id
        payload.leftAgreementPropertyId = leftAgreementProperty.id
    })

    it('should throw error of agreement not found', async() => {
        const leftSidePropertyController = new SideBySidePropertyController(faker.random.number({ min: agreement.id + 1 }), payload.leftAgreementPropertyId)
        await expect(leftSidePropertyController.upsertSideBySideProperty(payload, currentUser)).to.be.rejectedWith(Error, 'AGREEMENT_NOT_FOUND')
    })
    

    it('should throw error agreementProperty not confirmed', async () => {
        const leftSidePropertyController = new SideBySidePropertyController(agreement.id, payload.leftAgreementPropertyId)
        await expect(leftSidePropertyController.upsertSideBySideProperty(payload, currentUser)).to.be.rejectedWith(Error, 'AGREEMENT_PROPERTY_NOT_CONFIRMED')
        const rightSidePropertyController = new SideBySidePropertyController(agreement.id, payload.rightAgreementPropertyId)
        await expect(rightSidePropertyController.upsertSideBySideProperty(payload, currentUser)).to.be.rejectedWith(Error, 'AGREEMENT_PROPERTY_NOT_CONFIRMED')
    })
    
    it('should create a sideBySideProperty successfully', async () => {
        const propertyController = new AgreementPropertyController(agreement.id)
        await propertyController.confirmProperty(rightPropertyData.propertyId, "confirmed", currentUser)
        await propertyController.confirmProperty(leftPropertyData.propertyId, "confirmed", currentUser)

        const sideBySidePropertyController = new SideBySidePropertyController(agreement.id)
        const createdSideBySideProperty = await sideBySidePropertyController.upsertSideBySideProperty(payload, currentUser)
        createdSideBySideProperty.should.have.property('id')
        sideBySidePropertyId = createdSideBySideProperty.id
    })

    it('should throw error sideBySideProperty not found', async () => {
        const sideBySidePropertyController = new SideBySidePropertyController(agreement.id, faker.random.number({ min: sideBySidePropertyId + 1 }))
        await expect(sideBySidePropertyController.getSideBySideProperty(payload, currentUser)).to.be.rejectedWith(Error, 'SIDE_BY_SIDE_PROPERTY_NOT_AVAILABLE')
    })
    
    it('should update a sideBySideProperty successfully', async () => {
        const sideBySidePropertyController = new SideBySidePropertyController(agreement.id, sideBySidePropertyId)
        const updatedSideBySideProperty = await sideBySidePropertyController.upsertSideBySideProperty(payload, currentUser)
        updatedSideBySideProperty.should.have.property('id').and.equal(sideBySidePropertyId)
    })
    
    it('should list sideBySideProperty successfully', async () => {
        const sideBySidePropertyController = new SideBySidePropertyController(agreement.id, sideBySidePropertyId)
        const sideBySideProperties = await sideBySidePropertyController.listSideBySideProperties()
        sideBySideProperties.should.have.length.greaterThan(0)
    })
    
    it('should delete sideBySideProperty successfully', async () => {
        const sideBySidePropertyController = new SideBySidePropertyController(agreement.id, sideBySidePropertyId)
        const deletedSideBySideProperty = await sideBySidePropertyController.deleteSideBySideProperty(currentUser)
        deletedSideBySideProperty.should.have.property('id').and.equal(sideBySidePropertyId)
        
        const sideBySideProperties = await sideBySidePropertyController.listSideBySideProperties()
        sideBySideProperties.length.should.have.equal(0)
    })
    
})
