const Sequelize = require('sequelize')
const Op = Sequelize.Op
const faker = require('faker')
const { findOrCreateUser } = require('./../../helper')
const models = require('../../../../models')
const { personSchema, agreementSchema } = require('../../schema')
const ItemUsageController = require('../../../../controllers/refactorControllers/itemUsageController/itemUsageController')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const AgreementPropertyController = require('../../../../controllers/refactorControllers/agreementController/agreementPropertiesController')
const AgreementItemController = require('../../../../controllers/refactorControllers/agreementController/agreementItemController')
const PersonController = require('../../../../controllers/refactorControllers/personController/personController')
const ItemController = require('../../../../controllers/refactorControllers/itemController/itemController')
const VerifiedPersonController = require('../../../../controllers/refactorControllers/personController/verifiedPersonController')
const propertyCampuses = require('./../../../../seeders/property-campus.json')
const propertyTypes = require('./../../../../seeders/property-type.json')
const AgreementMemorialController = require('../../../../controllers/refactorControllers/agreementController/agreementMemorialController')
const hmisDB = require('./../../../../services/hmis/hmisConnection')
const _ = require('lodash')

async function getPropertyIds(propertyCampusName, propertyTypeName) {
    const propertyCampusId = _.find(propertyCampuses, { name: propertyCampusName }).id
    const propertyTypeId = _.find(propertyTypes, { name: propertyTypeName }).id
    let propertyIds = []
    const query = {}
    query.propertyTypeId = [propertyTypeId]
    query.propertyCampusId = propertyCampusId
    const propertys = await AgreementPropertyController.fetchListOfProperties(query)
    propertyIds = propertys.properties.map(prop => prop.id)
    return propertyIds
}

async function getAgreementLocationIds(agreementId, itemTypeId, searchTerm="",itemIndustryId = 1) {
    const query = {}
    let locationIds = []
    query.locationId = 2
    query.itemTypeId = itemTypeId
    query.itemIndustryId = itemIndustryId
    query.searchTerm = searchTerm
    query.agreementId = agreementId
    query.offset = 0
    query.limit = 10
    const locationItem = await ItemController.getItemsByFilter(query)
    locationIds = locationItem.items.map(item => item.locationItemId)
    return locationIds
}
async function getAgreementMemorialIds(){
       let memorialQuery = `SELECT DISTINCT lit.id FROM LocationItem lit
       INNER JOIN Item it on it.id = lit.itemId
        INNER JOIN ItemCategory itCat on itCat.id = it.itemCategoryId
       WHERE itCat.name = :monument`

       const memorialAddOns = await models.sequelize.query(memorialQuery,
        { 
            replacements :{
            monument: 'Monument Add On'
            },
            type: models.sequelize.QueryTypes.SELECT,
         })

      let memorials = await models.sequelize.query(memorialQuery,
        { type: models.sequelize.QueryTypes.SELECT,
            replacements :{
                monument: 'Memorial'
            } 
        })

      let memorialsBase = await models.sequelize.query(memorialQuery,
            { type: models.sequelize.QueryTypes.SELECT,
                replacements :{
                    monument: 'Monument Base'
                } 
            })

       let memorialAddOnsIds = memorialAddOns.map((memAddOn)=> memAddOn.id)
       let memorialIds = memorials.map((mem)=> mem.id)
       let memorialBaseIds = memorialsBase.map((memBase)=> memBase.id)
       return {
        memorialAddOnsIds,
        memorialIds,
        memorialBaseIds
       }
}

async function createPerson() {

    const person = { ...personSchema() }
    person.isAlive = false
    createdPerson = await PersonController.createOrUpdate(person, {}, {})
    const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
    await verifiedPersonController.verifyPerson(createdPerson)
    return createdPerson.id
}

async function createAgreement(personId, agreementSchema) {

    const saleTypeIds = await getSaleTypeIds(agreementSchema.type,agreementSchema.needType, personId)
    agreementSchema.saleTypeId = faker.random.arrayElement(saleTypeIds)
    agreement = await AgreementController.createOrEditAgreement(
        personId,
        agreementSchema
    )
    let agreementController = new AgreementController(agreement.id)
    await agreementController.checkoutAgreement(agreement.id, personId)
    return agreement.id
}

async function createProperties(agreementId, locationItemId, currentUser) {
    const propertyController = new AgreementPropertyController(agreementId)
    await propertyController.reserveProperty(locationItemId, currentUser, 'reserved')
    await propertyController.confirmProperty(locationItemId, 'confirmed', currentUser)
    const data =  await models.AgreementProperty.findOne({
    where: {
        propertyId: locationItemId,
        deletedAt: null,
        deletedBy: null
    }
})
return data.id
}

async function createLocationItems(agreementId, locationItemId, currentUser, agreementLocationItemId) {
    const agreementItemController = new AgreementItemController(agreementId)
    const agreementItem = await agreementItemController.createOrUpdate('add', {
        locationItemId,
        removeAll: false,
        userId: currentUser,
        timezone: 'Asia/Calcutta',
        agreementLocationItemId: agreementLocationItemId? agreementLocationItemId: null
    })
    return agreementItem.id
}

async function createMemorialItem(agreementId, locationItemId, currentUser) {
    const agreementMemorialController = new AgreementMemorialController(agreementId)
  let locationIds  = locationItemId.map((item)=>{
   return {
      locationItemId:item,
      itemType:'',
      userId: currentUser
   }
   })
    let agreementMonumentPayload = {
        memorialTypeId: 277,
        items: locationIds
    }
    let addedAgreementMemorial = await agreementMemorialController.createOrUpdate('add', agreementMonumentPayload)
    let memorialIds = []
    let memorialBaseIds = []
    let memorialAddOnsIds = []
   let itemIds =  addedAgreementMemorial &&  addedAgreementMemorial.agreementMemorialItems.map((item)=> item.id)
   itemIds.unshift(addedAgreementMemorial.id)
    return itemIds
}

async function createItemUsage(personId, reqBody) {
    const itemUsageController = new ItemUsageController(personId)
    const result = await itemUsageController.createItemUsageSelect(reqBody)
    return result
}



const getSaleTypeIds = async (type,needType, personId) => {
    const verifiedPersonController = new VerifiedPersonController(personId)
    const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(type, needType)
    return saleTypes.map(saleType => saleType.id)

}

const getHmisData = async (Property) =>{
    let properties = await models.Property.findOne({ where:{id:Property}})
    let query = `SELECT * FROM lot_space WHERE Lot_Sell_Unit_ID IN (${properties.lotSellUnitId})`
        let selectedItem = await hmisDB.sequelize.query(query, {
            type: hmisDB.sequelize.QueryTypes.SELECT
        })
    return selectedItem
}


module.exports = {
    createPerson,
    createAgreement,
    createProperties,
    createLocationItems,
    createItemUsage,
    getPropertyIds,
    getAgreementLocationIds,
    createMemorialItem,
    getAgreementMemorialIds,
    getHmisData
}