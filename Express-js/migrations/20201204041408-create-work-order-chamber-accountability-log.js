'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('WorkOrderChamberAccountabilityLog', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      workOrderId: {
        type: Sequelize.INTEGER
      },
      type: {
        type: Sequelize.STRING
      },
      logDate: {
        type: Sequelize.DATE
      },
      weight: {
        type: Sequelize.DECIMAL(10, 2)
      },
      operator: {
        type: Sequelize.INTEGER
      },
      chamberNumber: {
        type: Sequelize.INTEGER
      },
      deletedAt: {
        type: Sequelize.DATE
      },
      deletedBy: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      createdBy: {
        type: Sequelize.INTEGER
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      replacedBy: {
        type: Sequelize.INTEGER
      }
    }, {
      tableName: 'WorkOrderChamberAccountabilityLog'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('WorkOrderChamberAccountabilityLog');
  }
};