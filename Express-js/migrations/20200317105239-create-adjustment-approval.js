'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('AdjustmentApproval', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      type: {
        type: Sequelize.STRING
      },
      subType: {
        type: Sequelize.STRING
      },
      lessThanOrEquals: {
        type: Sequelize.DOUBLE
      },
      greaterThanOrEquals: {
        type: Sequelize.DOUBLE
      },
      adjustmentId: {
        type: Sequelize.INTEGER
      },
      approvalRoleId: {
        type: Sequelize.INTEGER
      },
      approvalTime: {
        type: Sequelize.INTEGER
      }
    },{
      tableName: 'AdjustmentApproval'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('AdjustmentApproval');
  }
};