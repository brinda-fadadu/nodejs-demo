const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const Op = require('sequelize').Op
const faker = require('faker')
const models = require('../../../../models')
chai.use(chaiAsPromised)
chai.should()
const { findOrCreateUser } = require('./../../helper')
const WebCemPropertyController = require('../../../../controllers/refactorControllers/webCemController/webCemPropertyController')
const ItemUsageController = require('../../../../controllers/refactorControllers/itemUsageController/itemUsageController')
const AgreementPropertyController = require('../../../../controllers/refactorControllers/agreementController/agreementPropertiesController')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const AddendumController = require('../../../../controllers/refactorControllers/agreementController/addendum')
const AgreementItemController = require('../../../../controllers/refactorControllers/agreementController/agreementItemController')
const { createAgreement, createLocationItems, createPerson, createProperties, createItemUsage, getPropertyIds, getAgreementLocationIds, createMemorialItem, getAgreementMemorialIds, getHmisData } = require('./itemUsageHelper')

describe('Item Usage Test', () => {
  let personId
  let currentUser
  let agreementId
  let itemUsageIds = []
  let agreementSchema = {
    needType: 1,
    type: 2,
    locationId: 2
  }
  let merchandise = []
  let services = []
  let memorial = {
    memorialAddOnsIds:[],
    memorialIds:[],
    memorialBaseIds:[]
  }
  let property = {
     lotSpaceIds: []
  }
  let itemUsageid
  let itemUsage
  let propertyid
  let locationItems = {
    merchandises: [],
    services: [],
    memorial:null
  }
  let agreementPropertyIds
  before(async () => {
    locationItems.memorial =  await getAgreementMemorialIds()
    currentUser = await findOrCreateUser()
    personId = await createPerson()
    await models.AgreementProperty.destroy({where : {
      propertyid: {[Op.in]: [766,668,843,399] 
      }
    }})
    propertyid = faker.random.arrayElement(await getPropertyIds("Hill Side", "Companion Grave"))
    agreementId = await createAgreement(personId, agreementSchema)
    agreementPropertyIds =  await createProperties(agreementId, propertyid, currentUser)
    locationItems.services = await getAgreementLocationIds(agreementId, 4, 'CL2ndInt')
    locationItems.merchandises = await getAgreementLocationIds(agreementId, 3)
     let memorialLocationId1 = [locationItems.memorial.memorialIds[faker.random.number({ min: 1, max: 3 })],locationItems.memorial.memorialBaseIds[faker.random.number({ min: 1, max: 3 })],locationItems.memorial.memorialAddOnsIds[faker.random.number({ min: 1, max: 3 })]]
      let memorialLocationId2 = [locationItems.memorial.memorialIds[faker.random.number({ min: 4, max: 6 })],locationItems.memorial.memorialBaseIds[faker.random.number({ min: 4, max: 6 })],locationItems.memorial.memorialAddOnsIds[faker.random.number({ min: 4, max: 6 })]]
    const [mid, mids, mbids,maoids] = await createMemorialItem(agreementId, memorialLocationId1 , currentUser.id)
    memorial.memorialIds.push(mids)
    memorial.memorialBaseIds.push(mbids)
    memorial.memorialAddOnsIds.push(maoids)
    const [mid1, mids1, mbids1,maoids1] = await createMemorialItem(agreementId, memorialLocationId2 , currentUser.id)
    memorial.memorialIds.push(mids1)
    memorial.memorialBaseIds.push(mbids1)
    memorial.memorialAddOnsIds.push(maoids1)
    services.push(await createLocationItems(agreementId, faker.random.arrayElement(locationItems.services), currentUser.id))
    services.push(await createLocationItems(agreementId, faker.random.arrayElement(locationItems.services), currentUser.id))
    merchandise.push(await createLocationItems(agreementId, faker.random.arrayElement(locationItems.merchandises), currentUser.id))
    merchandise.push(await createLocationItems(agreementId, faker.random.arrayElement(locationItems.merchandises), currentUser.id))
    let data = await getHmisData(propertyid)
    if(data){
      data.map((ele)=>{
        property.lotSpaceIds.push(ele.Lot_Space_ID)
      })
    }
  })

  // item usage summary counts
  //FYI in summary count or property listing we are fecthing Properties details but properties are associate with h_000 datebase so that for local testing it will be failing, so we need to connect database to dev servers(refactoring or QA)
  describe('Item usage summary counts', async () => {
    it('Should return person not found', async () => {
      try {
        const itemUsage = new ItemUsageController(personId + 1)
        await itemUsage.getItemUsageSummary()
      } catch (error) {
        error.should.have.property('message').and.to.be.equal('PERSON_NOT_FOUND')
      }
    })

    it('Should return available count of items without itemUsage data', async () => {
      const itemUsage = new ItemUsageController(personId)
      const result = await itemUsage.getItemUsageSummary()
      result.should.have.property('agreementMerchandise').and.to.be.equal(2)
      result.should.have.property('agreementServices').and.to.be.equal(2)
      result.should.have.property('agreementMemorial').and.to.be.equal(2)
      result.should.have.property('agreementPropertiesRights').and.to.be.equal(property.lotSpaceIds.length)
    })

    it('Should return available count of items with itemUsage Merchandises data', async () => {
      const itemUsage = new ItemUsageController(personId)
      let itemUsageBody = {
        resourceType: "Merchandises",
        resourceId: faker.random.arrayElement(merchandise),
        isDeleted: false,
        createdBy: currentUser.id
      }
      await createItemUsage(personId, itemUsageBody)
      const result = await itemUsage.getItemUsageSummary()
      result.should.have.property('agreementMerchandise').and.to.be.equal(1)
    })

    it('Should return available count of items with itemUsage Services data', async () => {
      const itemUsage = new ItemUsageController(personId)
      let itemUsageBody = {
        resourceType: "Services",
        resourceId: faker.random.arrayElement(services),
        isDeleted: false,
        createdBy: currentUser.id,
        agreementType:2
      }
      await createItemUsage(personId, itemUsageBody)
      const result = await itemUsage.getItemUsageSummary()
      result.should.have.property('agreementServices').and.to.be.equal(1)
    })

  it('Should return available count of items with itemUsage Memorial data', async () => {
    const itemUsage = new ItemUsageController(personId)
    let index = 0
    let itemUsageBody = {
      resourceType: "Memorial",
      resourceIds: [memorial.memorialIds[index], memorial.memorialBaseIds[index], memorial.memorialAddOnsIds[index]],
      isDeleted: false,
      createdBy: currentUser.id
    }
    const data =  await createItemUsage(personId, itemUsageBody)
    const result = await itemUsage.getItemUsageSummary()
    result.should.have.property('agreementMemorial').and.to.be.equal(1)
  })
  it('Should return available count of items with itemUsage Properties data', async () => {
    const itemUsage = new ItemUsageController(personId)
    let index = 0
    let itemUsageBody = {
      resourceType: "Properties",
      resourceId: agreementPropertyIds,
      isDeleted: false,
      lotSpaceId: property.lotSpaceIds[index],
      createdBy: currentUser.id
    }
    await createItemUsage(personId, itemUsageBody)
    const result = await itemUsage.getItemUsageSummary()
    result.should.have.property('agreementPropertiesRights').and.to.be.equal(property.lotSpaceIds.length -1)
  })
})

  // item usage list of items
  describe('Listing of items (Merchandises, services)for Item consumption', async () => {
    let addendumId
    it('Should return person not found', async () => {
      try {
        const itemUsage = new ItemUsageController(personId + 1)
        await itemUsage.getAvailableItemsForItemUsage({ filter: 'Merchandises' })
      } catch (error) {
        error.should.have.property('message').and.to.be.equal('PERSON_NOT_FOUND')
      }
    })

    it('Should return Filter is manditory by NOT sending query params', async () => {
      try {
        const itemUsage = new ItemUsageController(personId)
        await itemUsage.getAvailableItemsForItemUsage()
      } catch (error) {
        error.should.have.property('message').and.to.be.equal('FILTER_IS_MANDITORY')
      }
    })

    it('Should return Filter is manditory by sending EMPTY queryparams', async () => {
      try {
        const itemUsage = new ItemUsageController(personId)
        await itemUsage.getAvailableItemsForItemUsage()
      } catch (error) {
        error.should.have.property('message').and.to.be.equal('FILTER_IS_MANDITORY')
      }
    })

    it('Should return successful listing By sending dummy filter', async () => {
      const itemUsage = new ItemUsageController(personId)
      const result = await itemUsage.getAvailableItemsForItemUsage({ filter: 'abc' })
      result.should.have.property('count').and.to.eql(0)
      result.should.have.property('finalResult').of.length(0)
    })

    it('Should return successful listing for Merchandise items', async () => {
      const itemUsage = new ItemUsageController(personId)
      const result = await itemUsage.getAvailableItemsForItemUsage({ filter: 'Merchandises' })
      result.should.have.property('count').and.to.eql(2)
      result.should.have.property('finalResult').of.length(2)
      result.finalResult[0].should.to.deep.keys(['typeOfItem', 'agreementLocationItemId', 'agreementType', 'itemCode', 'itemName', 'itemPrice', 'addendumNumber', 'contractNumber', 'itemConsumptionResult'])
    })

    it('Should return successful listing for Merchandise items with pagination', async () => {
      const itemUsage = new ItemUsageController(personId)
      const result = await itemUsage.getAvailableItemsForItemUsage({ filter: 'Merchandises', page: 1, limit: 1 })
      result.should.have.property('count').and.to.eql(2)
      result.should.have.property('finalResult').of.length(1)
    })

    it('Should return successful listing for Merchandise items of Addendum with pagination', async () => {
      const agreementController = new AgreementController(agreementId)
      await agreementController.markAgreementComplete()
      const addendumController = new AddendumController(agreementId)
      const addendum = await addendumController.createAddendum()
      addendumId = addendum.id
      const agreementItemController = new AgreementItemController(agreementId)
      const payload = {
        addendumId: addendumId,
        locationItemId: faker.random.arrayElement(locationItems.merchandises),
        timezone: 'Asia/Calcutta'
      }
      await agreementItemController.createOrUpdate('add', payload)
      const itemUsage = new ItemUsageController(personId)
      const result = await itemUsage.getAvailableItemsForItemUsage({ filter: 'Merchandises', page: 1, limit: 5 })
      result.should.have.property('count').and.to.eql(3)
      result.should.have.property('finalResult').of.length(3)
    })

    it('Should return successful listing Service items', async () => {
      const itemUsage = new ItemUsageController(personId)
      const result = await itemUsage.getAvailableItemsForItemUsage({ filter: 'Services' })
      result.should.have.property('count').and.to.eql(2)
      result.should.have.property('finalResult').of.length(2)
    })

    it('Should return successful listing for Service items with pagination', async () => {
      const itemUsage = new ItemUsageController(personId)
      const result = await itemUsage.getAvailableItemsForItemUsage({ filter: 'Services', page: 1, limit: 1 })
      result.should.have.property('count').and.to.eql(2)
      result.should.have.property('finalResult').of.length(1)
    })

    it('Should return successful listing for Service items of Addendums with pagination', async () => {
      const agreementItemController = new AgreementItemController(agreementId)
      const payload = {
        addendumId: addendumId,
        locationItemId: faker.random.arrayElement(locationItems.services),
        timezone: 'Asia/Calcutta'
      }
      await agreementItemController.createOrUpdate('add', payload)
      const itemUsage = new ItemUsageController(personId)
      const result = await itemUsage.getAvailableItemsForItemUsage({ filter: 'Services', page: 1, limit: 5 })
      result.should.have.property('count').and.to.eql(3)
      result.should.have.property('finalResult').of.length(3)
    })

    it('Should return successful listing for Memorial items', async () => {
      const itemUsage = new ItemUsageController(personId)
      const result = await itemUsage.getAvailableItemsForItemUsage({ filter: 'Memorial' })
      result.should.have.property('count').and.to.eql(2)
      result.should.have.property('finalResult').of.length(2)
    })
    it('Should return successful listing for Properties items', async () => {
      const itemUsage = new ItemUsageController(personId)
      const result = await itemUsage.getAvailableItemsForItemUsage({ filter: 'Properties' })
      result.should.have.property('count').and.to.eql(property.lotSpaceIds.length)
      result.should.have.property('finalResult').of.length(property.lotSpaceIds.length)
    })

    it('Should return successful listing for Properties items with pagination', async () => {
      const itemUsage = new ItemUsageController(personId)
      const result = await itemUsage.getAvailableItemsForItemUsage({ filter: 'Properties', page: 1, limit: 1 })
      result.should.have.property('count').and.to.eql(property.lotSpaceIds.length)
      result.should.have.property('finalResult').of.length(1)
    })

  })

  // create item for item consumption
  describe('Creating records in itemUsage (select to selected status)for consuming item for a person', async () => {
    it('Should return person not found for item usage create', async () => {
      try {
        let itemUsageBody = {
          resourceType: "Merchandises",
          resourceId: faker.random.arrayElement(merchandise),
          isDeleted: false,
          createdBy: currentUser.id
        }
        await createItemUsage(personId + 1, itemUsageBody)
      } catch (error) {
        error.should.have.property('message').and.to.be.equal('PERSON_NOT_FOUND')
      }
    })

    it('Should return agreement location Item not found for item usage create', async () => {
      try {
        let itemUsageBody = {
          resourceType: "Merchandises",
          resourceId: faker.random.arrayElement(merchandise) + faker.random.number({ min: 5, max: 10 }),
          isDeleted: false,
          createdBy: currentUser.id
        }
        await createItemUsage(personId, itemUsageBody)
      } catch (error) {
        error.should.have.property('message').and.to.be.equal('AGREEMENT_LOCATION_ITEM_NOT_FOUND')
      }
    })

    it('Should return agreement memorial Item not found for item usage create', async () => {
      try {
        let index = 0
        let itemUsageBody = {
          resourceType: "Memorial",
          resourceIds: [memorial.memorialIds[index] + faker.random.number({ min: 10, max: 20 }), memorial.memorialBaseIds[index], memorial.memorialAddOnsIds[index]],
          isDeleted: false,
          createdBy: currentUser.id
        }
        await createItemUsage(personId, itemUsageBody)
      } catch (error) {
        error.should.have.property('message').and.to.be.equal('AGREEMENT_MEMORIAL_ITEM_NOT_FOUND')
      }
    })


    it('Should create merchandise item consumption', async () => {
      let itemUsageBody = {
        resourceType: "Merchandises",
        resourceId: faker.random.arrayElement(merchandise),
        isDeleted: false,
        createdBy: currentUser.id
      }
      result = await createItemUsage(personId, itemUsageBody)
      itemUsageid = result.itemUsageId
      result.should.have.property('status').and.to.be.equal('Selected')
      result.should.have.property('personId').and.to.be.equal(personId)
    })

   it('Should create memorial item consumption', async () => {
    let index = 1
        let itemUsageBody = {
          resourceType: "Memorial",
          resourceIds: [memorial.memorialIds[index], memorial.memorialBaseIds[index], memorial.memorialAddOnsIds[index]],
          isDeleted: false,
          createdBy: currentUser.id
        }
    result = await createItemUsage(personId, itemUsageBody)
    result.should.be.an('array').of.length(3)
    result[0].should.have.property('status').and.to.be.equal('Used')
    result[0].should.have.property('personId').and.to.be.equal(personId)
  })

  it('Should be return error create memorial item consumption for same memorial', async () => {
    try {
    let index = 1
        let itemUsageBody = {
          resourceType: "Memorial",
          resourceIds: [memorial.memorialIds[index], memorial.memorialBaseIds[index], memorial.memorialAddOnsIds[index]],
          isDeleted: false,
          createdBy: currentUser.id
        }
    result = await createItemUsage(personId, itemUsageBody)
    } catch (error){
      error.should.have.property('message').and.to.be.equal('MEMORIAL_ITEM_IS_ALREADY_USED')
    }
  })

  it('Should create memorial extras item consumption', async () => {
    let index = 1
        let itemUsageBody = {
          resourceType: "Memorial",
          resourceIds: [memorial.memorialAddOnsIds[index]],
          isDeleted: false,
          createdBy: currentUser.id
        }
    result = await createItemUsage(personId, itemUsageBody)
    result.should.have.property('status').and.to.be.equal('Used')
    result.should.have.property('personId').and.to.be.equal(personId)
  })

  it('Should to be create property item consumption', async () => {
    let index = 1
  let itemUsageBody = {
    resourceType: "Properties",
    resourceId: agreementPropertyIds,
    isDeleted: false,
    lotSpaceIds: property.lotSpaceIds[index],
    createdBy: currentUser.id
  }
  if(property.lotSpaceIds[index]){
    const result =  await createItemUsage(personId, itemUsageBody)
    result.should.have.property('status').and.to.be.equal('Selected')
    result.should.have.property('personId').and.to.be.equal(personId)
  }
  })
})

  //unselect item of item consumption
  describe('Unselecting item from itemUsage of a person(selected to select status)', async () => {
    it('Should to be unselect from selected item consumption', async () => {
      const itemUsage = new ItemUsageController(personId)
      result = await itemUsage.updateItemUsageUnselect(itemUsageid, 'Asia/Calcutta', currentUser.id)
      result.should.have.property('message').and.to.be.equal('Item unselected successfully')
    })
    it('should successfully remove the descedents associated to the property  and list the property and decedents', async () => {
      propertyContolleroObj = new  WebCemPropertyController(personId)
      payload = await propertyContolleroObj.removePropertyForDecedents([itemUsageid])
      payload.should.have.property('decedents').and.to.be.an('array').of.length.greaterThan(0)
      payload.should.have.property('property')
      payload.property.should.have.property('cl_ref')
  })
  
    it('Should not able to unselect from selected item consumption', async () => {
      try {
        const itemUsage = new ItemUsageController(personId)
        result = await itemUsage.updateItemUsageUnselect(itemUsageid + faker.random.number({ min: 5, max: 10 }), 'Asia/Calcutta', currentUser.id)
      } catch (error) {
        error.should.have.property('message').and.to.be.equal('UNSELECTION_OF_ITEM_IN_ITEM_CONSUMPTION_FAILED')
      }

    })
  })

  describe('Confirming selected items in item usage(selected to confirmed status)', async () => {
    it('Should to be confirm from selected item consumption', async () => {
      let itemUsageBody = {
        resourceType: "Services",
        resourceId: faker.random.arrayElement(merchandise),
        isDeleted: false,
        createdBy: currentUser.id,
        agreementType:2
      }
      result = await createItemUsage(personId, itemUsageBody)
      const itemUsage = new ItemUsageController(personId)
      itemUsageId = result.itemUsageId
      result = await itemUsage.updateItemUsageConfirm([result.itemUsageId], currentUser.id)
      result.should.be.an('array').of.length(1)
    })

    it('Should not able to confirm from selected item consumption', async () => {
      try {
        const itemUsage = new ItemUsageController(personId)
        result = await itemUsage.updateItemUsageConfirm([itemUsageId + faker.random.number({ min: 5, max: 10 })], currentUser.id)
      } catch (error) {
        error.should.have.property('message').and.to.be.equal('SELECTED_ITEM_NOT_CONFIRMED_FOR_ITEM_CONSUMPTION')
      }
    })
  })

  // get select merchandise  item consumption
  describe('Review of selected merchandise items of a person(only selected status)', async () => {
    it('Should return person not found for get select merchandise  item consumption ', async () => {
      try {
        let itemUsageBody = {
          resourceType: "Merchandises",
          resourceId: faker.random.arrayElement(merchandise),
          isDeleted: false,
          createdBy: currentUser.id
        }
        const itemUsage = new ItemUsageController(personId + 1)
        result = await itemUsage.getSelectedMerchandiseItems()
        await createItemUsage(personId + 1, itemUsageBody)
      } catch (error) {
        error.should.have.property('message').and.to.be.equal('PERSON_NOT_FOUND')
      }
    })

    it('Should to be get select merchandise  item consumption', async () => {
      const itemUsage = new ItemUsageController(personId)
      result = await itemUsage.getSelectedMerchandiseItems()
      result.should.be.an('array')
    })
  })

  after(async () => {
    const propertyController = new AgreementPropertyController(agreementId)
    await propertyController.releaseProperty(propertyid,currentUser)
    await models.ItemUsage.destroy({ where: { personId } })
    await models.AgreementMemorial.destroy({ where: { agreementId } })
    await models.AgreementMemorialItem.destroy({ where: { id : [...memorial.memorialAddOnsIds,...memorial.memorialIds,...memorial.memorialBaseIds ] } })
  })
})
