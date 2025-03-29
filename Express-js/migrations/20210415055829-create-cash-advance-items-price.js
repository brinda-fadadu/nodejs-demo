'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('CashAdvanceItemsPrice', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      itemId: {
        type: Sequelize.INTEGER
      },
      countyId: {
        type: Sequelize.INTEGER
      },
      price: {
        type: Sequelize.DECIMAL(10, 2)
      }
    }, {
      tableName:'CashAdvanceItemsPrice'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('CashAdvanceItemsPrice');
  }
};