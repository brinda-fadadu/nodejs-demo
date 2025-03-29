'use strict';
const csvtojson = require('csvtojson')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const result =  await csvtojson().fromFile(process.cwd()+'/seeders/properties.csv')
    const lotSellUnitIds = result.map(ele => {
      return {
        lotSellUnitId: ele.lotSellUnitId
      }
    })
    return queryInterface.bulkInsert('MissingProperty', lotSellUnitIds)    
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('MissingProperty', null, {
      truncate: true
    });
    
  }
};
