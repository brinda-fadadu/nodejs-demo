'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('AdjustmentType', [{
      "id": 1,
      "adjustmentType": "PromoDiscount"
    },
    {
      "id": 2,
      "adjustmentType": "OtherDiscount"
    },
    {
      "id": 3,
      "adjustmentType": "Adjustment"
    }], { logging: console.log }, {
      id: {
        autoIncrement: true
      }
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('AdjustmentType', null, {});

  }
};
