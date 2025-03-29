'use strict';
const models = require('../../models');
const { getSheetData } = require('./gardenspec-sheet')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const gardenSpecExceptions = await getSheetData('Garden Spec Exceptions')
    let categoryIds = await models.ItemCategory.findAll({ where: {} })
    let service = await models.ItemType.findOne({ where: {
      name: 'Services'
    }})
    let merchandise = await models.ItemType.findOne({ where: { name: 'Merchandises'}})
    let serviceId = service.toJSON().id
    let merchandiseId = merchandise.toJSON().id
    categoryIds = JSON.parse(JSON.stringify(categoryIds))
    //Finding the categoryIds for services and merchandise    

    let attributeValueIds = await models.AttributeValue.findAll({ where: {} })
    attributeValueIds = JSON.parse(JSON.stringify(attributeValueIds))
    //Finding the AttributeValueIds    

    let itemCategoryAttributeValueIds = await models.ItemCategoryAttributeValue.findAll({ where: {} })
    itemCategoryAttributeValueIds = JSON.parse(JSON.stringify(itemCategoryAttributeValueIds))
    //Finding the ItemCategoryAttributeValueIds
    
    const result = await models.sequelize.query(`SELECT icav.id, 
    av.name as attributeValue,
    ic.id AS itemCategoryId,
    ic.name as itemCategory  FROM ItemCategoryAttributeValue icav
        INNER JOIN AttributeValue av ON icav.attributeValueId = av.id 
        INNER JOIN ItemCategory ic ON ic.id = icav.itemCategoryId`)
    const gardenSpecExceps = result[0]
    let gardenSpecExceptionsData = []
    await Promise.all(gardenSpecExceptions.map(async (gardenSpecException) => {
      let data = null
      if (gardenSpecException.LotSellUnitID) {
        let property = await models.Property.findOne({where: {lotSellUnitId: gardenSpecException.LotSellUnitID }})
        if (property) {
        let propertyId = property.toJSON().id
        if (gardenSpecException['Interment Service']) {
          gardenSpecException['Interment Service'].split('|').forEach(gardenSpecExceptionVault => {
                  data = {
                  propertyId: propertyId,
                  itemTypeId: serviceId, 
                  isAllow: 1,
                  itemCategoryAttributeValueId: gardenSpecExceps.find(ele => {
                    return (ele.itemCategory === 'Interment Service' && ele.attributeValue === gardenSpecExceptionVault.trim())
                  }).id
                }
                gardenSpecExceptionsData.push(data)
          })
        }

        if (gardenSpecException['Cremation Service']) {
          data = {
            propertyId: propertyId,
            itemTypeId: serviceId, 
            isAllow: 1,
            itemCategoryAttributeValueId: gardenSpecExceps.find(ele => {
              return (ele.itemCategory === 'Cremation Service' && ele.attributeValue === 'Cemetery Cremation Service')    // gardenSpecException['Cremation Service']
            }).id
          }
          gardenSpecExceptionsData.push(data)
        }

        if (gardenSpecException['Witness Cremation']) {
          data = {
            propertyId: propertyId,
            itemTypeId: serviceId, 
            isAllow: 1,
            itemCategoryAttributeValueId: gardenSpecExceps.find(ele => {
              return (ele.itemCategory === 'Cremation Service' && ele.attributeValue === 'Cemetery Witness Cremation Services')     // gardenSpecException['Witness Cremation']
            }).id
          }
          gardenSpecExceptionsData.push(data)
        }

        

        if (gardenSpecException['Vault']) {          
          gardenSpecException['Vault'].split('|').forEach(gardenSpecExceptionVault => {
            data = {
              propertyId: propertyId,
              itemTypeId: merchandiseId, 
              isAllow: 1,
              itemCategoryAttributeValueId: gardenSpecExceps.find(ele => {
                return (ele.itemCategory === 'Vault' && ele.attributeValue === gardenSpecExceptionVault.trim())
              }).id
            }
            gardenSpecExceptionsData.push(data)
          })
          
          
        }

        if (gardenSpecException['Casket']) {
          gardenSpecException['Casket'].split('|').forEach(gardenSpecExceptionCasket => {
          data = {
            propertyId: propertyId,
            itemTypeId: merchandiseId, 
            isAllow: 1,
            itemCategoryAttributeValueId: gardenSpecExceps.find(ele => {
              return (ele.itemCategory === 'Casket' && ele.attributeValue === gardenSpecExceptionCasket.trim())
            }).id
          }
          gardenSpecExceptionsData.push(data)
          })
        }
        // TODO: Need to uncomment if we get different values than ALL
        /*
        if (gardenSpecException['Urn']) {
            data = {
              propertyId: propertyId,
              itemTypeId: merchandiseId, 
              isAllow: 1,
              itemCategoryAttributeValueId: gardenSpecExceps.find(ele => {
                return (ele.itemCategory === 'Urn' && ele.attributeValue === gardenSpecException['Urn'])
              }).id
            }
            gardenSpecExceptionsData.push(data)          
        }

        if (gardenSpecException['Keepsake']) {
          console.log('Keepsake')
          data = {
            propertyId: propertyId,
            itemTypeId: merchandiseId, 
            isAllow: 1,
            itemCategoryAttributeValueId: gardenSpecExceps.find(ele => {
              return (ele.itemCategory === 'Keepsake' && ele.attributeValue === gardenSpecException['Keepsake'])
            }).id
          }
          gardenSpecExceptionsData.push(data)
        }

        if (gardenSpecException['Documentation Fee']) {
          console.log('Documentation Fee')
          data = {
            propertyId: propertyId,
            itemTypeId: merchandiseId, 
            isAllow: 1,
            itemCategoryAttributeValueId: gardenSpecExceps.find(ele => {
              return (ele.itemCategory === 'Documentation Fee' && ele.attributeValue === gardenSpecException['Documentation Fee'])
            }).id
          }
          gardenSpecExceptionsData.push(data)
        }

        if (gardenSpecException['Bequest Service']) {
          console.log('Bequest Service')
          data = {
            propertyId: propertyId,
            itemTypeId: merchandiseId, 
            isAllow: 1,
            itemCategoryAttributeValueId: gardenSpecExceps.find(ele => {
              return (ele.itemCategory === 'Bequest Service' && ele.attributeValue === gardenSpecException['Bequest Service'])
            }).id
          }
          gardenSpecExceptionsData.push(data)
        } */
        return data
      } else {
        console.log('LotSellUnitId:::::', gardenSpecException.LotSellUnitID)
      }
      }
      }))
      gardenSpecExceptionsData = gardenSpecExceptionsData.filter (ele => {
        if(ele) {
          return ele
        } else{
          return false
        }
        
      })
    return queryInterface.bulkInsert('GardenSpecException', gardenSpecExceptionsData, null, {
      id: {
        autoIncrement: true
      }
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('GardenSpecException', null, {
      truncate: true
    });
  }
};
