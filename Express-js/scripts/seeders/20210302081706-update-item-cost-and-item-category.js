'use strict';
const {
  getSheetData
} = require('../seed-scripts')
const {
  Item
} = require('../../models')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let jsonData = await getSheetData('Item')
    jsonData = jsonData.map(ele => {
      let temp = {
        itemCategoryId: ele.itemCategoryId,
        code: ele.code,
        cost: ele.cost,
      }

      temp.itemCategoryId = Number(temp.itemCategoryId)
      if(temp.itemCategoryId == 0 ){
        temp.itemCategoryId = null
      }
      return temp
    })
    return await Promise.all(jsonData.map(async(item) => {
      await Item.update({
        itemCategoryId: item.itemCategoryId,
        cost: item.cost,
    }, {
        where: {
          code: item.code
        }
    })
    }))
  },

  down: async (queryInterface, Sequelize) => {
    return true
  }
};
