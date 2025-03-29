'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('OrderStatus', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      }
    }, {
      tableName:'OrderStatus'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('OrderStatus');
  }
};