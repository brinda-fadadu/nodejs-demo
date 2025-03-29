'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('CremationStatus', [
      {
        "id": 1,
        "name": "With Crematory",
      }, 
      {
        "id": 2,
        "name": "With Family",
      }
    ], { logging: console.log, timestamp: false }, {
      id: {
        autoIncrement: true
      },
      timestamps: false
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('CremationStatus', null, {});
  }
};
