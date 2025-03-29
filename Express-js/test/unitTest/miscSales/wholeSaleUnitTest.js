const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const faker = require('faker')
chai.use(chaiAsPromised)
chai.should()
const models = require('../../../models')
const {
  createNonVerifiedPerson,
  createVerifiedPerson,
  createDecedent,
  createPartner,
  returnItemsForWholesale
} = require('./schema')
const { createItemUsage } = require('./../caseInfo/itemUsage/itemUsageHelper')
const expect = chai.expect
const moment = require('moment')
const WholeSaleCremationController = require('../../../controllers/refactorControllers/miscSalesController/wholeSalesController')
const ItemUsageController = require('../../../controllers/refactorControllers/itemUsageController/itemUsageController')
const SchedulingController = require('../../../controllers/refactorControllers/schedulingController/schedulingController')

describe('Creating a wholeSale cremation', () => {
  let partnerId

  before(async () => {
    const partner = await createPartner()
    partnerId = partner.id
  })

  it('should throw an error if non existing partnerId is selected for wholeSaleCremation', async () => {
    const decedentId = await createDecedent()
    const reqBody = {
      partnerId: faker.random.number(),
      decedents: [decedentId]
    }
    await expect(
      WholeSaleCremationController.createWholeSaleCremation(reqBody)
    ).to.be.rejectedWith(Error, 'PARTNER_NOT_FOUND')
  })

  it('should throw an error if non existing persons are added as decedents', async () => {
    const reqBody = {
      partnerId: partnerId,
      decedents: [faker.random.number()]
    }
    await expect(
      WholeSaleCremationController.createWholeSaleCremation(reqBody)
    ).to.be.rejectedWith(Error, 'ADD_VERIFIED_AND_EXISTING_PERSONS')
  })

  it('should throw an error if non verified persons are added as decedents', async () => {
    const reqBody = {
      partnerId: partnerId,
      decedents: [await createNonVerifiedPerson({ isAlive: false })]
    }
    await expect(
      WholeSaleCremationController.createWholeSaleCremation(reqBody)
    ).to.be.rejectedWith(Error, 'ADD_VERIFIED_PERSONS')
  })

  it('should throw an error saying alive persons are not allowed to be added as decedents when trying to add alive persons', async () => {
    const reqBody = {
      partnerId: partnerId,
      decedents: [await createVerifiedPerson({ isAlive: true })]
    }
    await expect(
      WholeSaleCremationController.createWholeSaleCremation(reqBody)
    ).to.be.rejectedWith(
      Error,
      'ALIVE_PERSONS_ARE_NOT_ALLOWED_TO_BE_ADDED_AS_DECEDENTS'
    )
  })

  it('should throw an error when same decedents are added multiple times', async () => {
    const decedentId = await createDecedent()
    const reqBody = {
      partnerId: partnerId,
      decedents: [decedentId, decedentId]
    }
    await expect(
      WholeSaleCremationController.createWholeSaleCremation(reqBody)
    ).to.be.rejectedWith(Error, 'MULTIPLE_SAME_DECEDENTS')
  })

  it('should be able to create a wholeSaleCremation and generate a identifier for the same', async () => {
    const reqBody = {
      partnerId: partnerId,
      decedents: [await createDecedent()]
    }
    const wholeSaleCremation = await WholeSaleCremationController.createWholeSaleCremation(
      reqBody
    )
    expect(wholeSaleCremation).to.have.property('contractNumber')
    expect(wholeSaleCremation)
      .to.have.property('id')
      .and.greaterThan(0)
  })

  it('should get list of wholesaleCremation', async () => {
    const reqBody = {
      partnerId: partnerId,
      decedents: [await createDecedent()]
    }
    const wholeSaleCremation = await WholeSaleCremationController.createWholeSaleCremation(
      reqBody
    )
    const queryObj = {
      partners: [reqBody.partnerId],
      status: 1,
      identifier: wholeSaleCremation.contractNumber
    }
    const wholeSaleCremationList = await WholeSaleCremationController.getListOfWholeSaleCremation(
      queryObj
    )
    expect(wholeSaleCremationList)
      .to.have.property('count')
      .and.to.be.equal(1)
  })
})

describe('Listing Items selected for the wholeSale cremation', () => {
  let wholeSaleCremationId,
    locationItemIds,
    decedentId,
    agmtServiceLocationIds = [],
    agmtAddOnsIds = [],
    serviceLocItemIds = [],
    addOnsLocItemIds = []
  before(async () => {
    let partnerId
    const partner = await createPartner()
    decedentId = await createDecedent()
    partnerId = partner.id
    const reqBody = {
      partnerId: partnerId,
      decedents: [decedentId]
    }
    const wholeSaleCremation = await WholeSaleCremationController.createWholeSaleCremation(
      reqBody
    )
    wholeSaleCremationId = wholeSaleCremation.id
    locationItemIds = await returnItemsForWholesale('Wholesale Cremation')
  })

  it('should be able to list the selectedItems of a wholeSaleCremation', async () => {
    const addItemsreqBody = {
      locationItemId: locationItemIds[0],
      quantity: 1,
      action: 'add'
    }
    const wholeSaleController = new WholeSaleCremationController(
      wholeSaleCremationId
    )
    const agreementLocationIds = await wholeSaleController.createOrUpdateWholeSaleCremationItems(
      addItemsreqBody,
      1,
      wholeSaleCremationId
    )
    agmtServiceLocationIds.push(agreementLocationIds.id)
    serviceLocItemIds.push(locationItemIds[0])
    const selectedItems = await wholeSaleController.getWholeSaleCremationItems()
    expect(selectedItems).to.have.any.keys('fee', 'addOn', 'services')
  })

  describe('Item usage testing on summary count and listing', () => {
    let itemUsageId, schedulingUpdatedDetails
    before(async () => {
      locationItemIds = []
      locationItemIds = await returnItemsForWholesale('Wholesale Cremation')
      serviceLocItemIds.push(locationItemIds[1])
      let addItemsreqBody = {
        locationItemId: locationItemIds[1],
        quantity: 1,
        action: 'add'
      }
      wholeSaleController = new WholeSaleCremationController(
        wholeSaleCremationId
      )
      const agreementLocationIds = await wholeSaleController.createOrUpdateWholeSaleCremationItems(
        addItemsreqBody,
        1,
        wholeSaleCremationId
      )
      agmtServiceLocationIds.push(agreementLocationIds.id)
      locationItemIds = []
      locationItemIds = await returnItemsForWholesale(
        'Wholesale Cremation Add on'
      )
      addOnsLocItemIds.push(locationItemIds[0])
      addItemsreqBody = {
        locationItemId: locationItemIds[0],
        quantity: 2,
        action: 'add'
      }
      wholeSaleController = new WholeSaleCremationController(
        wholeSaleCremationId
      )
      const addOnsData = await wholeSaleController.createOrUpdateWholeSaleCremationItems(
        addItemsreqBody,
        1,
        wholeSaleCremationId
      )
      agmtAddOnsIds.push(addOnsData.id)
    })
    it('Should return available count of items in itemUsage', async () => {
      const itemUsage = new ItemUsageController(decedentId)
      const result = await itemUsage.getItemUsageSummary()
      result.should.have.property('agreementServices').and.to.be.within(1, 3)
      result.should.have.property('addOns').and.to.be.within(1, 3)
    })
    it('Should return successful listing Service items', async () => {
      const itemUsage = new ItemUsageController(decedentId)
      const result = await itemUsage.getAvailableItemsForItemUsage({
        filter: 'Services'
      })
      result.should.have.property('count').and.to.within(1, 3)
      result.should.have.property('finalResult').of.length.within(1, 3)
    })
    it('Should return successful listing addOns items', async () => {
      const itemUsage = new ItemUsageController(decedentId)
      const result = await itemUsage.getAvailableItemsForItemUsage({
        filter: 'addOns'
      })
      result.should.have.property('count').and.to.within(1, 3)
      result.should.have.property('finalResult').of.length.within(1, 3)
    })
    it('Should to be selected item consumption service', async () => {
      let itemUsageBody = {
        resourceType: 'Services',
        resourceId: agmtServiceLocationIds[0],
        isDeleted: false,
        agreementType: 4
      }
      result = await createItemUsage(decedentId, itemUsageBody)
      result.should.have.property('status').and.to.be.equal('Selected')
      result.should.have.property('personId').and.to.be.equal(decedentId)
      itemUsageId = result.itemUsageId
    })
    it('Should to be return error unselect service before new service select', async () => {
      try {
        let itemUsageBody = {
          resourceType: 'Services',
          resourceId: faker.random.arrayElement(agmtServiceLocationIds),
          isDeleted: false,
          agreementType: 4
        }
        result = await createItemUsage(decedentId, itemUsageBody)
        result.should.have.property('status').and.to.be.equal('Selected')
        result.should.have.property('personId').and.to.be.equal(decedentId)
      } catch (error) {
        error.should.have
          .property('message')
          .and.to.be.equal('UNSELECT_SERVICE_BEFORE_NEW_SERVICE_SELECT')
      }
    })
    it('Should to be selected item consumption addOns', async () => {
      let itemUsageBody = {
        resourceType: 'addOns',
        resourceId: faker.random.arrayElement(agmtAddOnsIds),
        isDeleted: false
      }
      result = await createItemUsage(decedentId, itemUsageBody)
      result.should.have.property('status').and.to.be.equal('Selected')
      result.should.have.property('personId').and.to.be.equal(decedentId)
      addOnItemUsageId = result.itemUsageId
    })

    describe('Create or Update and Get WholeSale Cremation Schedule Service', async ()=>{
      let wscSchedulingData = {
        "personId": 0,
        "itemUsageId": 0
      }
      it('It should throw error personId not found',async ()=>{
          try{
            wscSchedulingData.personId = 0
            const schedulingController = new SchedulingController()
            await schedulingController.createOrUpdateScheduledCemeteryService(wscSchedulingData)               
          } catch(error){
              error.should.have.property('message').and.to.be.equal('PERSON_NOT_FOUND')
          }
      })
      it('It should throw error Item Usage not found', async ()=>{
        try{
          wscSchedulingData.personId = decedentId
          const schedulingController = new SchedulingController();
          let res = await schedulingController.createOrUpdateScheduledCemeteryService(wscSchedulingData)               
        } catch(error) {
            error.should.have.property('message').and.to.be.equal('ITEM_USAGE_NOT_FOUND')
        }
      })
      it('It should create scheduling with only Interment Informationn', async ()=>{
        wscSchedulingData.itemUsageId = itemUsageId
        wscSchedulingData.intermentInformationDetails = {
          "beginningTime": moment().set({'hour': 15, 'minute': 0}),
          "endingTime": moment().set({'hour': 20, 'minute': 0})
        }
        const schedulingController = new SchedulingController();
        const result = await schedulingController.createOrUpdateScheduledCemeteryService(wscSchedulingData)     
        result.should.have.property('itemUsageId').to.be.equal(itemUsageId)   
        result.intermentInformationDetails.should.have.property('beginningTime').to.not.equal(null)
        result.intermentInformationDetails.should.have.property('endingTime').to.not.equal(null)             
      })
      it('It should create scheduling with Casket Data', async ()=>{
        wscSchedulingData.casketDetails = {
          "isOutSideCasket": true,
          "casketType": "Test"
        }
        const schedulingController = new SchedulingController();
        const result = await schedulingController.createOrUpdateScheduledCemeteryService(wscSchedulingData)     
        result.should.have.property('itemUsageId').to.be.equal(itemUsageId)  
        result.should.have.property('casketDetails').and.to.be.an('object')
        result.casketDetails.should.have.property('id')
        result.casketDetails.should.have.property('isOutSideCasket').and.to.be.equal(wscSchedulingData.casketDetails.isOutSideCasket)
        result.casketDetails.should.have.property('casketType').and.to.be.equal(wscSchedulingData.casketDetails.casketType)
      })
      it('It should create scheduling with Urn Information Details', async ()=>{
        wscSchedulingData.urnInformationDetails = {
          "isFamilyOwnedUrn": true,
          "height": "",
          "width": "",
          "depth": "",
          "urnType": null,
          "urnStatus": "",
          "receivedDate": null
        }
        const schedulingController = new SchedulingController();
        const result = await schedulingController.createOrUpdateScheduledCemeteryService(wscSchedulingData)     
        result.should.have.property('itemUsageId').to.be.equal(itemUsageId)  
        result.should.have.property('urnInformationDetails').and.to.be.an('object')
        result.urnInformationDetails.should.have.property('id')
        result.urnInformationDetails.should.have.property('isFamilyOwnedUrn').and.to.equal(wscSchedulingData.urnInformationDetails.isFamilyOwnedUrn)
      })
      it('It should create a scheduling generic Deatils', async ()=>{
        wscSchedulingData.genericDetails = {
          "isWitnessedCremation": true,
          "noOfWitness": 1,
          "instruction": "Test"
        }
        const schedulingController = new SchedulingController();
        const result = await schedulingController.createOrUpdateScheduledCemeteryService(wscSchedulingData)     
        result.should.have.property('itemUsageId').to.be.equal(itemUsageId)  
        result.genericDetails.should.have.property('isWitnessedCremation').and.to.be.equal(wscSchedulingData.genericDetails.isWitnessedCremation)
        result.genericDetails.should.have.property('noOfWitness').to.be.equal(wscSchedulingData.genericDetails.noOfWitness)
        result.genericDetails.should.have.property('instruction').to.be.equal(wscSchedulingData.genericDetails.instruction) 
      })
      it('It should create scheduling with notes sections ', async ()=>{
          wscSchedulingData.notesFromStaff = [{
            content:'note for staff'
          }]
          const schedulingController = new SchedulingController();
          const result = await schedulingController.createOrUpdateScheduledCemeteryService(wscSchedulingData)     
          result.should.have.property('itemUsageId').to.be.equal(itemUsageId)
          result.notesFromStaff.should.be.an('array').of.length(1)
          schedulingUpdatedDetails = result
      })
      it('It should update scheduling', async ()=>{
        wscSchedulingData.id = schedulingUpdatedDetails.id
        wscSchedulingData.intermentInformationDetails.id = schedulingUpdatedDetails.intermentInformationDetails.id
        wscSchedulingData.casketDetails.id = schedulingUpdatedDetails.casketDetails.id
        wscSchedulingData.genericDetails.id = schedulingUpdatedDetails.genericDetails.id
        wscSchedulingData.genericDetails.noOfWitness = 2
        const schedulingController = new SchedulingController();
        const result = await schedulingController.createOrUpdateScheduledCemeteryService(wscSchedulingData)   
        result.should.have.property('itemUsageId').to.be.equal(itemUsageId)  
        result.should.have.property('id').to.be.equal(schedulingUpdatedDetails.id)
        result.genericDetails.should.have.property('noOfWitness').to.be.equal(wscSchedulingData.genericDetails.noOfWitness)
      })
      
      describe('Get Wholesale Cremation scheduling deatails',()=>{
        it('It should throw error person id and cemetery id  are requried',async ()=>{
          try{
            const schedulingController = new SchedulingController();
            await schedulingController.getScheduledCemeteryServiceDetails()               
          } catch(error){
            error.should.have.property('message').and.to.be.equal('PERSONID_AND_SCHEDULEDCEMETERYSERVICEID_ARE_REQUIRED')
          }
        })
        it('It should throw error personId is not found',async ()=>{
          try{
            const schedulingController = new SchedulingController();
            await schedulingController.getScheduledCemeteryServiceDetails(decedentId+1000, schedulingUpdatedDetails.id)               
          } catch(error){
            error.should.have.property('message').and.to.be.equal('PERSON_NOT_FOUND')
          }
        })
        it('It should throw error service is not found',async ()=>{
          try{
            const schedulingController = new SchedulingController();
            const result = await schedulingController.getScheduledCemeteryServiceDetails(decedentId, schedulingUpdatedDetails.id+1000)               
          } catch(error){
            error.should.have.property('message').and.to.be.equal('SCHEDULABLE_CEMETERY_SERVICE_NOT_FOUND')
          }
        })    
        it('It should get scheduling data', async ()=>{
          const schedulingController = new SchedulingController();
          const result = await schedulingController.getScheduledCemeteryServiceDetails(decedentId, schedulingUpdatedDetails.id)  
          result.should.have.property('itemUsageId').to.be.equal(itemUsageId)  
          result.should.have.property('id').to.be.equal(schedulingUpdatedDetails.id)
          result.intermentInformationDetails.should.have.property('beginningTime').to.not.equal(null)               
          result.intermentInformationDetails.should.have.property('endingTime').to.not.equal(null) 
          result.genericDetails.should.have.property('instruction').to.be.equal(wscSchedulingData.genericDetails.instruction)               
          result.genericDetails.should.have.property('isWitnessedCremation').to.be.equal(wscSchedulingData.genericDetails.isWitnessedCremation)
          result.genericDetails.should.have.property('noOfWitness').to.be.equal(wscSchedulingData.genericDetails.noOfWitness)
          result.should.have.property('casketDetails').and.to.be.an('object')
          result.casketDetails.should.have.property('id')
          result.notesFromStaff.should.be.an('array').of.length(2)
        })
      })
    })

    describe('Removal Scenarios in Wholesale Cremation', async () => {
      describe ('Removal Scenarios of Services/Add Ons in Wholesale Cremation', async () => {
        it('Should throw error while removing the used Service Item', async () => {
          try {
            await models.ItemUsage.update({
              usageStatus: 2
            }, {
                where: {
                  id: itemUsageId
                }
            })
            let addItemsreqBody = {
              agreementLocationItemId: agmtServiceLocationIds[0],
              locationItemId: serviceLocItemIds[0],
              quantity: 1,
              action: 'remove'
            }
            wholeSaleController = new WholeSaleCremationController(
              wholeSaleCremationId
            )
            await wholeSaleController.createOrUpdateWholeSaleCremationItems(
              addItemsreqBody,
              1,
              wholeSaleCremationId
            )
          } catch (error) {
            error.should.have.property('message').and.to.be.equal('Item(s) utilized in service schedule cannot be updated/removed')
          }
        })
        it('Should throw error while removing the used AddOns Item', async () => {
          try {
            await models.ItemUsage.update({
              usageStatus: 2
            }, {
                where: {
                  id: addOnItemUsageId
                }
            })
            let addItemsreqBody = {
              agreementLocationItemId: agmtAddOnsIds[0],
              locationItemId: addOnsLocItemIds[0],
              quantity: 1,
              action: 'remove'
            }
            wholeSaleController = new WholeSaleCremationController(
              wholeSaleCremationId
            )
            await wholeSaleController.createOrUpdateWholeSaleCremationItems(
              addItemsreqBody,
              1,
              wholeSaleCremationId
            )
          } catch (error) {
            error.should.have.property('message').and.to.be.equal('Item(s) utilized in service schedule cannot be updated/removed')
          }
        })
      })
    })
  })
})
