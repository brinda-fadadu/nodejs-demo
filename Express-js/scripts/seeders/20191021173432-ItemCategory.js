'use strict';
const {
  getSheetData
} = require('../seed-scripts')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let jsonData = await getSheetData('ItemCategory')
    jsonData = jsonData.map(ele => {
      ele.createdAt = new Date()
      ele.updatedAt = new Date()
      return ele
    })

    return queryInterface.bulkInsert('ItemCategory', jsonData, {
    },{
      id:{
        autoIncrement: true
      }
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('ItemCategory', {},{truncate: true})
  }
};
