'use strict';
const models = require('../../models');
const _ = require('lodash')
const { getSheetData} = require('./gardenspec-sheet');
const logger = require('../../lib/logger');

module.exports = {
  up: async(queryInterface, Sequelize) => {
   
    let gardenSpecsException = await getSheetData('Garden Spec Exceptions')
    gardenSpecsException = JSON.parse(JSON.stringify(gardenSpecsException))
    const memorialAddOnExceptions = []
    const missingAddOns = []

    await Promise.all(gardenSpecsException.map(async (gardenSpec) => {
      let memorialAddOnExceptionData = {
      }
      // get propertyId based on LotSellUnitID
      const property = await models.Property.findOne({
        where: {
          lotSellUnitId: gardenSpec.LotSellUnitID
        },
        attributes: ['id']
      })
      if (property) {
        memorialAddOnExceptionData.propertyId = property.id
        if(gardenSpec['Design (Check for Memorial Add-on attribute)']){
          const attributeValue = await models.AttributeValue.findOne({
            where: {
              name: gardenSpec['Design (Check for Memorial Add-on attribute)']
            },
            attributes: ['id']
          })
          if (attributeValue) {
            memorialAddOnExceptionData.attributeValueId = attributeValue.id
          }
        }
        
        if (!_.isEmpty(memorialAddOnExceptionData)) {
          memorialAddOnExceptionData.isRequired = 1
        }
        memorialAddOnExceptions.push(memorialAddOnExceptionData)
      } else {
        missingAddOns.push(gardenSpec.LotSellUnitID)
      }
    }))
    logger.info('missing lot sell unit ids', missingAddOns)
    return queryInterface.bulkInsert('MemorialAddOnSpecException', memorialAddOnExceptions, { logging: console.log, timestamp: false }, {
      id: {
        autoIncrement: true
      },
      timestamps: false
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('MemorialAddOnSpecException', null, {
      truncate: true
    });
  }
};
