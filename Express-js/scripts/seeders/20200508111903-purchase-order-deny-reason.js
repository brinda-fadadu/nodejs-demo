'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('PurchaseOrderDenyReason', [
      {
        "id": 1,
        "name": "Pull From Inventory",
      }, 
      {
        "id": 2,
        "name": "Item Not Available",
      },
      {
        "id": 3,
        "name": "Contract Cancelled",
      },
      {
        "id": 4,
        "name": "Return Inventory",
      },
      {
        "id": 5,
        "name": "Inventory",
      },
      {
        "id": 6,
        "name": "No Order",
      },
      {
        "id": 7,
        "name": "Pre-Buried",
      }
    ], { logging: console.log, timestamp: false }, {
      id: {
        autoIncrement: true
      },
      timestamps: false
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('PurchaseOrderDenyReason', null, {});

  }
};
