'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('PurchaseOrderStatus', [
      {
        "id": 1,
        "name": "ToBeOrdered",
      }, 
      {
        "id": 2,
        "name": "OnOrder",
      },
      {
        "id": 3,
        "name": "Received",
      },
      {
        "id": 4,
        "name": "Invalid",
      }
    ], { logging: console.log, timestamp: false }, {
      id: {
        autoIncrement: true
      },
      timestamps: false
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('PurchaseOrderStatus', null, {});

  }
};
