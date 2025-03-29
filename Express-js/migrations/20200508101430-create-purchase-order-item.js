'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('PurchaseOrderItem', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      orderDenyReasonId: {
        type: Sequelize.INTEGER
      },
      statusId: {
        type: Sequelize.INTEGER
      },
      createdBy: {
        type: Sequelize.INTEGER
      },
      updatedBy: {
        type: Sequelize.INTEGER
      },
      deletedAt: {
        type: Sequelize.DATE
      },
      deletedBy: {
        type: Sequelize.INTEGER
      },
      quantity: {
        type: Sequelize.INTEGER
      },
      unitPrice: {
        type: Sequelize.DECIMAL(10,2),
        defaultValue: 0.0
      },
      shippingCost: {
        type: Sequelize.DECIMAL(10,2),
        defaultValue: 0.0
      },
      locationItemId: {
        type: Sequelize.INTEGER
      },
      unitTax: {
        type: Sequelize.DECIMAL(10,2),
        defaultValue: 0.0
      },
      purchaseOrderId: {
        type: Sequelize.INTEGER
      },
      orderDate: {
        type: Sequelize.DATE
      },
      expectedDeliveryDate: {
        type: Sequelize.DATE
      },
      receivedDate: {
        type: Sequelize.DATE
      },
      receivingDocumentNumber: {
        type: Sequelize.STRING
      },
      orderStatusId: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    }, {
      tableName:'PurchaseOrderItem'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('PurchaseOrderItem');
  }
};