'use strict';
const {
  getSheetData
} = require('../seed-scripts')
module.exports = {
  up: async (queryInterface, Sequelize) => {    
    let jsonData = await getSheetData('ItemIndustry')
    jsonData = jsonData.map(ele => {
      ele.createdAt = new Date()
      ele.updatedAt = new Date()
      return ele
    })

    return queryInterface.bulkInsert('ItemIndustry', jsonData, {
    },{
      id:{
        autoIncrement: true
      }
    })
    
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('ItemIndustry', {}, {
      truncate: true
    })
  }
};
