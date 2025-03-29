'use strict';
const _ = require('underscore')
const {
  getSheetData
} = require('../seed-scripts')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const items = await getSheetData('Item')
    const itemAttributeValues = await getSheetData('ItemAttributeValue')
    const jsonData = []    
    itemAttributeValues.forEach(ele => {      
      let itemAttributeValue = {}
      let item = _.find(items, {code: ele.itemCode})
      if (item) {
        itemAttributeValue.itemId = item.id
        itemAttributeValue.attributeValueId = ele.attributeValueId
        itemAttributeValue.createdAt = new Date()
        itemAttributeValue.updatedAt = new Date()
        jsonData.push(itemAttributeValue)
      }
      
    })
    return queryInterface.bulkInsert('ItemAttributeValue', jsonData, {},{
      id: {
        autoIncrement: true
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('ItemAttributeValue', {}, {
      truncate: true
    })
  }
};
