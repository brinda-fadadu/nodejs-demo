const faker = require('faker')
const { personSchema } = require('./schema')
const AgreementController = require('../../controllers/refactorControllers/agreementController/agreementController')
const AgreementPropertyController = require('../../controllers/refactorControllers/agreementController/agreementPropertiesController')
const PersonController = require('../../controllers/refactorControllers/personController/personController')
const VerifiedPersonController = require('../../controllers/refactorControllers/personController/verifiedPersonController')
const PropertyController = require('../../controllers/refactorControllers/propertyController/propertyController')
const {  findOrCreateUser} = require('./helper')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const AddendumController = require('../../controllers/refactorControllers/agreementController/addendum')
chai.use(chaiAsPromised)
const expect = chai.expect
chai.should()

const getSaleTypeIds = async (type, person) => {
  const verifiedPersonController = new VerifiedPersonController(person.id)

      const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(type, person.isAlive ? 1: 2 )
      return saleTypes.map(saleType => saleType.id)

}

describe('creating the properties', () => {
    let createdPerson,agreement,currentUser, addendum, properties, propertyData
    let agreementSchema = {
      needType: 2,
      type: 2,
      locationId: 1
    }

    
   
    before(async () => {
     currentUser = await findOrCreateUser()
      const person = { ...personSchema() }
      createdPerson = await PersonController.createOrUpdate(person, {}, {})
      const verifiedPersonController = new VerifiedPersonController(
        createdPerson.id
      )
      await verifiedPersonController.verifyPerson(createdPerson)
      await verifiedPersonController.createArrangement()
      const saleTypeIds = await getSaleTypeIds(agreementSchema.type, createdPerson)
        agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)      
       agreement = await AgreementController.createOrEditAgreement(
        createdPerson.id,
        agreementSchema
      )
      const propertyTypes = await PropertyController.fetchListOfPropertyTypes()
      const propertyTypeId = propertyTypes.filter(ele => ele.name='Companion Grave').id
      const propertyCampuses = await PropertyController.fetchListOfPropertyCampusesWithGardens()
      const propertyCampus = propertyCampuses.find(ele => {
        return ele.name = 'Hill Side'
      })
      
      const propertyGarden = propertyCampus.propertyGardens.find(ele => {
        return ele.name = 'HS-White Lotus'
      })
      const result = await PropertyController.fetchListOfPropertys({propertyTypeId:propertyTypeId })
      properties = result.properties      
      propertyData = {
        propertyId:properties[0].id,
        reservationStatus:"reservecd",
        resourceType:"Property"
      }
    })

   

    it('should  get property not found', async () => {
        try {
            let propertyId = faker.random.number({ min: 1001, max: 1005 })
           const propertyController = new AgreementPropertyController(agreement.id)
            result = await propertyController.reserveProperty(propertyId ,currentUser ,propertyData.reservationStatus)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('PROPERTY_NOT_FOUND')
        }
      })

      it('should  get agreement not found', async () => {
        try {
           const propertyController = new AgreementPropertyController(agreement.id+1)
            result = await propertyController.reserveProperty(propertyData.propertyId ,currentUser ,propertyData.reservationStatus)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('STATEMENT_NOT_FOUND')
        }
      })

      it('should reservation not found', async () => {
        try{
          propertyData.reservationStatus = "confirmed";
          const propertyController = new AgreementPropertyController(agreement.id)
          result = await propertyController.confirmProperty(propertyData.propertyId ,propertyData.reservationStatus , currentUser)
        }catch(error){
          error.should.have.property('message').and.to.be.equal('RESERVATION_NOT_FOUND')
        }
    })
      it('should reserve property to agreement', async () => {
            propertyData.reservationStatus = "reserved";
            const propertyController = new AgreementPropertyController(agreement.id)
            result = await propertyController.reserveProperty(propertyData.propertyId,currentUser ,propertyData.reservationStatus )
            result.should.have.property('propertyId').and.to.be.equal(propertyData.propertyId)
      })

      it('should get property unavailable reserve property to agreement', async () => {
          try{
        propertyData.reservationStatus = "reserved";
         const  propertyController = new AgreementPropertyController(agreement.id)
          result = await propertyController.reserveProperty(propertyData.propertyId,currentUser ,propertyData.reservationStatus )
          }catch(error){
            error.should.have.property('message').and.to.be.equal('PROPERTY_UNAVAILABLE')
          }
    })

    it('should confirmed property to agreement', async () => {
      propertyData.reservationStatus = "confirmed";
       const propertyController = new AgreementPropertyController(agreement.id)
        result = await propertyController.confirmProperty(propertyData.propertyId, propertyData.reservationStatus, currentUser)
        result.should.to.be.an('array').of.length(1)
        

    })

    it('should confirmed property not reserved', async () => {
        try{
        propertyData.reservationStatus = "confirmed";
       const propertyController = new AgreementPropertyController(agreement.id)
        result = await propertyController.confirmProperty(propertyData.propertyId ,propertyData.reservationStatus , currentUser)
        }catch(error){
          error.should.have.property('message').and.to.be.equal('PROPERTY_NOT_RESERVED')
        }
    })

    

    it('should to be get property details', async () => {
        const propertyController = new AgreementPropertyController(agreement.id)
        result = await propertyController.reviewProperties({status:'confirmed'})
        result.should.to.be.an('array').of.length(1)
    })

    it('should to be get property details', async () => {
        const propertyController = new AgreementPropertyController(agreement.id+1)
        result = await propertyController.reviewProperties({status:'confirmed'})
        result.should.to.be.an('array').of.length(0)
    })

    it('Should contain agreement number for confirmed properties', async () => {
      const propertyController = new AgreementPropertyController(agreement.id)
      result = await propertyController.reviewProperties({status:'confirmed'})
      result.should.to.be.an('array').of.length(1) 
      result[0].should.to.have.any.keys('agreementNumber')
    })

    it('Should contain agreement number for both reserved and confirmed properties', async () => {
      const propertyController = new AgreementPropertyController(agreement.id)
      result = await propertyController.reviewProperties({ })
      result.should.to.be.an('array').of.length(1)
      result[0].should.to.have.any.keys('agreementNumber')
    })

    it('Should get interment and additional rights information', async () => {      
      const result = await AgreementPropertyController.getIntermentAndAdditionalRights(agreement.id)
      result.should.to.have.keys('defaultRights','additionalRightsCount','totalAdditionalRightsPrice')
    })

    it('should release property to agreement', async () => {
        propertyData.reservationStatus = "released";
        const  propertyController = new AgreementPropertyController(agreement.id)
          result = await propertyController.releaseProperty(propertyData.propertyId)
          result.should.to.be.equal(1)
      })

      it('should be get propertys details', async () => {
        const paymentResponse = await AgreementPropertyController.fetchListOfProperties({agreementId:agreement.id})
        paymentResponse.should.property('properties').and.to.be.an('array')
    })
    it('should be get propertys details different conditions', async () => {
      const paymentResponse = await AgreementPropertyController.fetchListOfProperties({
        propertyTypeId:[faker.random.number({ min: 10, max: 5 })],
        propertyCampusId:faker.random.number({ min: 10, max: 5 }),
        propertyGardenId:[faker.random.number({ min: 10, max: 5 })],
        minPrice:1,
        maxPrice:1000000
      })
      paymentResponse.should.property('properties').and.to.be.an('array')
  })

    it('should be get property campus details', async () => {
        const paymentResponse = await AgreementPropertyController.fetchListOfPropertyCampusesWithGardens()
        paymentResponse.should.to.be.an('array')
    })

    it('should be get propertys types details', async () => {
        const paymentResponse = await AgreementPropertyController.fetchListOfPropertyTypes()
        paymentResponse.should.to.be.an('array')
    })


    it('Complete the agreement', async () => {
        const agreementController = new AgreementController(agreement.id)
        const result = await agreementController.markAgreementComplete()
        result.should.to.be.an('array').of.length(1)
    })

    it('Should return an error while trying to reserve a property when the agreement was completed', async () => {
      propertyData = {
        propertyId:properties[1].id,
        reservationStatus:"reserved",
        resourceType:"Property"
      }
      const propertyController = new AgreementPropertyController(agreement.id)
      await expect(propertyController.reserveProperty(propertyData.propertyId,currentUser ,propertyData.reservationStatus )).to.be.rejectedWith('AGREEMENT_ALREADY_COMPLETED')
    })

    it('Create a new addendum', async () => {
        const addendumController = new AddendumController(agreement.id)
        addendum = await addendumController.createAddendum()
        addendum.should.have.property('id')
        addendum.should.have.property('agreementId').and.equal(agreement.id)
    })

    it('Reserve a property with addendum', async () => {
      const propertyController = new AgreementPropertyController(agreement.id)      
      let agreementProperty = await propertyController.reserveProperty(propertyData.propertyId,currentUser ,propertyData.reservationStatus, addendum.id)
      agreementProperty = agreementProperty.toJSON()
      agreementProperty.should.to.have.any.keys('id', 'agreementId', 'addendumId', 'reservationStatus')
      agreementProperty.reservationStatus.should.be.equal('reserved')
    })
    it('Confirm a property with addendum', async ()=> {
      propertyData.reservationStatus = 'confirmed'
      const propertyController = new AgreementPropertyController(agreement.id)
      let agreementProperty = await propertyController.confirmProperty(propertyData.propertyId,currentUser ,propertyData.reservationStatus, addendum.id)
      agreementProperty.should.to.be.an('array').of.length(1)
    })
})
