'use strict';
const models = require('../../models');
const { sequelize } = require('../../models');
const _ = require('lodash')
const {getSheetData} = require('./gardenspec-sheet')
module.exports = {
  up: async(queryInterface, Sequelize) => {
    //Finding the ItemCategoryAttributeValueIds    
    
    const itemCategoryAttributeValues = await sequelize.query(`SELECT DISTINCT icav.id, ic.name AS itemCategory, icav.itemCategoryId,icav.attributeValueId,av.name AS attributeValue FROM ItemCategoryAttributeValue icav 
    INNER JOIN AttributeValue av ON icav.attributeValueId = av.id 
    INNER JOIN ItemCategory ic ON icav.itemCategoryId = ic.id 
     WHERE 
        av.name IN (
            'Full Body',
            'Cremated Remains',
            'Standard Vault',
            'Pre-Buried DGC',
            'Urn Vault',
            'Standard Casket',
            'Cemetery Cremation Service',
            'Cemetery Witness Cremation Services',
            'Oversize Casket',
            'Oversize vault'
        ) AND 
        ic.name IN (
            'Interment Service',
            'Disinterment Service',
            'Vault',
            'Casket',
            'Cremation Service'
        )`, {
          type: models.sequelize.QueryTypes.SELECT
        })

      const casketValues = await models.sequelize.query(`
      select DISTINCT icav.id, ic.name AS itemCategory, icav.itemCategoryId,icav.attributeValueId,av.name AS attributeValue from ItemCategoryAttributeValue icav
      inner join AttributeValue av on icav.attributeValueId=av.id
      inner join ItemCategory ic on ic.id=icav.itemCategoryId
      where  av.name IN (
        'Full Body',
        'Cremated Remains',
        'Standard Vault',
        'Pre-Buried DGC',
        'Urn Vault',
        'Standard Casket',
        'Cemetery Cremation Service',
        'Cemetery Witness Cremation Services',
        'Oversize Casket',
        'Oversize vault'
    ) AND  ic.name in ('Casket')
      `, {type: models.sequelize.QueryTypes.SELECT})


      const vaultValues = await models.sequelize.query(`
      select DISTINCT icav.id, ic.name AS itemCategory, icav.itemCategoryId,icav.attributeValueId,av.name AS attributeValue from ItemCategoryAttributeValue icav
      inner join AttributeValue av on icav.attributeValueId=av.id
      inner join ItemCategory ic on ic.id=icav.itemCategoryId
      where  av.name IN (
        'Full Body',
        'Cremated Remains',
        'Standard Vault',
        'Pre-Buried DGC',
        'Urn Vault',
        'Standard Casket',
        'Cemetery Cremation Service',
        'Cemetery Witness Cremation Services',
        'Oversize Casket',
        'Oversize vault'
    ) AND  ic.name in ('Vault')
      `, {type: models.sequelize.QueryTypes.SELECT})

      const intermentRightsValues = await models.sequelize.query(`
      select DISTINCT icav.id, ic.name AS itemCategory, icav.itemCategoryId,icav.attributeValueId,av.name AS attributeValue from ItemCategoryAttributeValue icav
      inner join AttributeValue av on icav.attributeValueId=av.id
      inner join ItemCategory ic on ic.id=icav.itemCategoryId
      where  av.name IN (
        'Full Body',
        'Cremated Remains',
        'Standard Vault',
        'Pre-Buried DGC',
        'Urn Vault',
        'Standard Casket',
        'Cemetery Cremation Service',
        'Cemetery Witness Cremation Services',
        'Oversize Casket',
        'Oversize vault'
    ) AND  ic.name in ('Vault')
      `, {type: models.sequelize.QueryTypes.SELECT})

      

    // Taking Service Id and Merchandise Id
    let service = await models.ItemType.findOne({ where: {name: 'Services'}})
    let merchandise = await models.ItemType.findOne({ where: {name: 'Merchandises'}})
        service = await service.toJSON()
        merchandise =  await merchandise.toJSON()        
    let serviceId =  service.id 
    let merchandiseId = merchandise.id
    /**
     * Garden specs
     */
    let intermentRights = await getSheetData('Garden Spec')
    const gardenSpecs = []
    intermentRights = await Promise.all(intermentRights.map(async (intermentRight, index) => {
      
      const query = `SELECT ir.id FROM IntermentRights ir 
      INNER JOIN PropertyType pt ON ir.propertyTypeId = pt.id 
      INNER JOIN PropertyCampus pc ON ir.propertyCampusId = pc.id 
      WHERE pt.name ='${intermentRight['Property Type']}'  AND pc.code='${intermentRight.Campus}' AND ir.graves =${intermentRight.Graves} AND ir.rights =${intermentRight.Rights} AND ir.maxRights = ${intermentRight['Max Rights']}`      
      const result = await models.sequelize.query(query)
      console.log(result)
      intermentRight.id = result[0][0].id
      return intermentRight
    }))
    
    await Promise.all(intermentRights.map(async(intermentRight, index) => {
      const intermentRightValue = intermentRight['Interment Service']
      if (intermentRightValue) {
        if(intermentRightValue === 'All') {
          
          intermentRightsValues.forEach(intermentService => {
            if (intermentService) {
              gardenSpecs.push({
                intermentRightsId: intermentRight.id,
                itemTypeId: serviceId,
                itemCategoryAttributeValueId: intermentService.id
              })
            }
          })
        }else {
          intermentRightValue.split('|').forEach(intermentServices => {
            let intermentService = _.find(itemCategoryAttributeValues, (ele) => {
              return ele.itemCategory === 'Interment Service' && ele.attributeValue === intermentServices.trim()
            })
            if (intermentService) {
              gardenSpecs.push({
                intermentRightsId: intermentRight.id,
                itemTypeId: serviceId,
                itemCategoryAttributeValueId: intermentService.id
              })
            }
          })
        }
      }
      if (intermentRight['Disinterment Service']) {
        gardenSpecs.push({
          intermentRightsId: intermentRight.id,
          itemTypeId: serviceId,
          itemCategoryAttributeValueId: _.find(itemCategoryAttributeValues, (ele) => {
            return ele.itemCategory === 'Disinterment Service' && ele.attributeValue === intermentRightValue
          }).id
        })
      }
      
      gardenSpecs.push({
        intermentRightsId: intermentRight.id,
        itemTypeId: serviceId,
        itemCategoryAttributeValueId: _.find(itemCategoryAttributeValues, (ele) => {
          return ele.itemCategory === 'Cremation Service' && ele.attributeValue === 'Cemetery Cremation Service'
        }).id
      })
      gardenSpecs.push({
        intermentRightsId: intermentRight.id,
        itemTypeId: serviceId,
        itemCategoryAttributeValueId: _.find(itemCategoryAttributeValues, (ele) => {
          return ele.itemCategory === 'Cremation Service' && ele.attributeValue === 'Cemetery Witness Cremation Services'
        }).id
      })
      
      if (intermentRight.Casket) {
        if (intermentRight.Casket === 'All') {
          casketValues.forEach(intermentRightCasket => {
            gardenSpecs.push({
              intermentRightsId: intermentRight.id,
              itemTypeId: merchandiseId,
              itemCategoryAttributeValueId: _.find(
                itemCategoryAttributeValues,
                ele => {
                  return (
                    ele.itemCategory === 'Casket' &&
                    ele.attributeValue ===
                      intermentRightCasket.attributeValue.trim()
                  )
                }
              ).id
            })
          })
        } else {
          intermentRight.Casket.split('|').forEach(intermentRightCasket => {
            gardenSpecs.push({
              intermentRightsId: intermentRight.id,
              itemTypeId: merchandiseId,
              itemCategoryAttributeValueId: _.find(
                itemCategoryAttributeValues,
                ele => {
                  return (
                    ele.itemCategory === 'Casket' &&
                    ele.attributeValue === intermentRightCasket.trim()
                  )
                }
              ).id
            })
          })
        }
      }
      if (intermentRight.Vault) {
        console.log('Vault:::::')
        if(intermentRight.Vault==='All') {
          vaultValues.forEach(intermentRightVault => {    
            gardenSpecs.push({
              intermentRightsId: intermentRight.id,
              itemTypeId: merchandiseId,
                itemCategoryAttributeValueId: _.find(itemCategoryAttributeValues, (ele) => {
                  return ele.itemCategory === 'Vault' && ele.attributeValue === intermentRightVault.attributeValue.trim()
                }).id
            })    
            })
         } else {
          intermentRight.Vault.split('|').forEach(intermentRightVault => {
            const intermentRightVaultName= _.get(intermentRightVault,'attributeValue', 'intermentRightVault')          
           const vault = _.find(itemCategoryAttributeValues, (ele) => {
             return ele.itemCategory === 'Vault' && ele.attributeValue === intermentRightVaultName.trim()
           })
           if(vault) {
             gardenSpecs.push({
               intermentRightsId: intermentRight.id,
               itemTypeId: merchandiseId,
               itemCategoryAttributeValueId:vault.id
             })
           }
         })
         }
      }
      
    }))
    console.log(gardenSpecs)
    return queryInterface.bulkInsert('GardenSpec', gardenSpecs, { logging: console.log, timestamp: false }, {
      id: {
        autoIncrement: true
      },
      timestamps: false
    }) 
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('GardenSpec', null, {
      terminate: true
    });
  }
};
