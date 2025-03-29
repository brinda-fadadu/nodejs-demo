'use strict';
const {
  sequelize
} = require('../../models')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let jsonData = await sequelize.query(`SELECT DISTINCT iav.attributeValueId, ic.id AS itemCategoryId FROM Item it 
    INNER JOIN ItemCategory ic ON ic.id = it.itemCategoryId 
    INNER JOIN ItemAttributeValue iav ON iav.itemId = it.id`,{
      type: sequelize.QueryTypes.SELECT
    })
    jsonData = jsonData.map(ele => {
      ele.createdAt = new Date()
      ele.updatedAt = new Date()
      return ele
    })
    return queryInterface.bulkInsert('ItemCategoryAttributeValue', jsonData, { },{
      id:{
        autoIncrement: true
      }
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('ItemCategoryAttributeValue', {}, {
      truncate: true
    })
  }
};
