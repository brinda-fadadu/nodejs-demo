'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('CremationStatus', {
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
      tableName:'CremationStatus'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('CremationStatus');
  }
};