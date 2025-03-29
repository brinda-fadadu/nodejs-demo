'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    const saleTypes = require('./sale-type.json')
    return queryInterface.bulkInsert('SaleType', saleTypes, {
    },{
      id: {
        autoIncrement: true
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('SaleType', null, {})

  }
};
