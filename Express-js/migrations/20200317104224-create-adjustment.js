'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Adjustment', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING
      },
      adjustmentTypeId: {
        type: Sequelize.INTEGER
      },
      agreementTypeId: {
        type: Sequelize.INTEGER
      },
      code: {
        type: Sequelize.STRING
      },
      description: {
        type: Sequelize.STRING
      },
      discountUnit: {
        type: Sequelize.STRING
      },
      maxDiscountValue: {
        type: Sequelize.DOUBLE
      },
      discountValue: {
        type: Sequelize.DOUBLE
      },
      startDate: {
        type: Sequelize.DATE
      },
      endDate: {
        type: Sequelize.DATE
      },
      isApprovalNeeded: {
        type: Sequelize.BOOLEAN
      },
      isCustomAmount: {
        type: Sequelize.BOOLEAN
      },
      isOnlyDiscount: {
        type: Sequelize.BOOLEAN
      },
      isDisabled: {
        type: Sequelize.BOOLEAN
      },
      createdBy: {
        type: Sequelize.INTEGER
      },
      updatedBy: {
        type: Sequelize.INTEGER
      },
      deletedBy: {
        type: Sequelize.INTEGER
      },
      deletedAt: {
        type: Sequelize.DATE
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    },{
      tableName: 'Adjustment'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Adjustment');
  }
};