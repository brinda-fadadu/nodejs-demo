'use strict';
const {
  getSheetData
} = require('../seed-scripts')
const { sequelize } = require('../../models')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let jsonData = await getSheetData('AttributeValue')
    jsonData = jsonData.map(ele => {
      let temp = {
        id: ele.id,
        attributeId: ele.attributeId,
        name: ele.name,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      return temp
    })
    return queryInterface.bulkInsert('AttributeValue', jsonData, {
    },{
      id: {
        autoIncrement: true
      }
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('AttributeValue', {}, {
      truncate: true
    })
  }
};
