'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    const propertyTypes = require('./property-type.json')

    return queryInterface.bulkInsert('PropertyType', propertyTypes, 
      {
        logging: console.log
      }, {
        id: {
          autoIncrement: true
        }
      })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('PropertyType', null, {})
  }
};
