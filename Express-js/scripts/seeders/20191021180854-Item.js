'use strict';
const {
  getSheetData
} = require('../seed-scripts')
const _ = require('underscore')

// NOTE: before importing item excel file check hide columns deleted or not
// In Excel for the name field out of 5444 items we have 114 names with comma(,) so before importing replace with pipee symbol if you found comma in between name or description of item.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    let jsonData = await getSheetData('Item')
    jsonData = jsonData.map(ele => {
      let temp = {
        id: ele.id,
        name: ele.name,
        description: ele.description,
        itemCategoryId: ele.itemCategoryId,
        code: ele.code,
        cost: ele.cost,
        isTaxable: ele.isTaxable,
        isActive: ele.isActive,
        itemStatusId: ele.itemStatusId,
        vendorId: ele.vendorId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
     
      temp.name = temp.name.replace(/\;/gi, ",")
      temp.itemCategoryId = Number(temp.itemCategoryId)
      if(temp.itemCategoryId == 0 ){
        temp.itemCategoryId = null
      }
      return temp
    })
    return queryInterface.bulkInsert('Item', jsonData, {},{
      id: {
        autoIncrement: true
      }
    }) 
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Item', {}, {
      truncate: true
    })
  }
};
