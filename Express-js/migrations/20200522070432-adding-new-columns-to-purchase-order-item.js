'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('PurchaseOrderItem', 'purchaseOrderNumber', {
        type: Sequelize.STRING
      }),
      queryInterface.addColumn('PurchaseOrderItem', 'itemUsageId', {
        type: Sequelize.INTEGER
      }),
      queryInterface.addColumn('PurchaseOrderItem', 'replacedLocationItemId', {
        type: Sequelize.INTEGER
      }),
      queryInterface.addColumn('PurchaseOrderItem', 'caseInfoFormId', {
        type: Sequelize.STRING
      })
    ])
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('PurchaseOrderItem', 'purchaseOrderNumber'),
      queryInterface.removeColumn('PurchaseOrderItem', 'itemUsageId'),
      queryInterface.removeColumn('PurchaseOrderItem', 'replacedLocationItemId'),
      queryInterface.removeColumn('PurchaseOrderItem', 'caseInfoFormId')
    ])
  }
};
