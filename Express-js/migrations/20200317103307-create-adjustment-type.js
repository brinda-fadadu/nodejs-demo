'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('AdjustmentType', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      adjustmentType: {
        type: Sequelize.STRING
      }
    }, {
      tableName:'AdjustmentType'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('AdjustmentType');
  }
};