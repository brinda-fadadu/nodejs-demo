'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('ItemType', {
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
      tableName:'ItemType'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('ItemType');
  }
};