'use strict';
const {
  getSheetData
} = require('../seed-scripts')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let jsonData = await getSheetData('ItemCategoryIndustry')
    jsonData = jsonData.map(ele => {
      let temp = {
        id: ele.id,
        itemCategoryId: ele.itemCategoryId,
        itemIndustryId: ele.itemIndustryId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      return temp
    })
    return queryInterface.bulkInsert('ItemCategoryIndustry', jsonData, {
    },{
      id: {
        autoIncrement: true
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('ItemCategoryIndustry', {}, {
      truncate: true
    })
  }
};
