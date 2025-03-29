'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    const propertyGardens = require('./property-garden.json')

    return queryInterface.bulkInsert('PropertyGarden', propertyGardens, 
      {
        logging: console.log
      }, {
        id: {
          autoIncrement: true
        }
      })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('PropertyGarden', null, {
      truncate: true
    })
  }
};
