'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    const serviceTypes = require('./service-type.json')

    return queryInterface.bulkInsert('ServiceType', serviceTypes, 
      {
        logging: console.log
      }, {
        id: {
          autoIncrement: true
        }
      })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('ServiceType', null, {})
  }
};
