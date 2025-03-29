'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('SubService', {
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
      tableName: 'SubService'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('SubService');
  }
};