'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('HMISDataSyncStatus', [
      {
        "id": 1,
        "name": "InQueue",
      }, 
      {
        "id": 2,
        "name": "InProgress",
      },
      {
        "id": 3,
        "name": "Success",
      },
      {
        "id": 4,
        "name": "Error",
      }
    ], { logging: console.log, timestamp: false }, {
      id: {
        autoIncrement: true
      },
      timestamps: false
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('HMISDataSyncStatus', null, {});

  }
};

