'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.changeColumn('AgreementItemPrice', 'totalPrice', {
        type: Sequelize.DECIMAL(28,2)
      }),
      queryInterface.changeColumn('Agreement', 'totalPurchasePrice', {
        type: Sequelize.DECIMAL(28,2)
      }),
      queryInterface.changeColumn('Agreement', 'due', {
        type: Sequelize.DECIMAL(28,2)
      }),
      queryInterface.changeColumn('Agreement', 'totalCashPrice', {
        type: Sequelize.DECIMAL(28,2)
      }),
      queryInterface.changeColumn('Agreement', 'totalPrice', {
        type: Sequelize.DECIMAL(28,2)
      }),
      queryInterface.changeColumn('Agreement', 'totalTax', {
        type: Sequelize.DECIMAL(28,2)
      }),
      queryInterface.changeColumn('AgreementAdjustment', 'amount', {
        type: Sequelize.DECIMAL(28,2)
      }),
      queryInterface.changeColumn('ChangeLog', 'unitPrice', {
        type: Sequelize.DECIMAL(28,2)
      }),
      queryInterface.changeColumn('ChangeLog', 'totalPrice', {
        type: Sequelize.DECIMAL(28,2)
      })
    ])
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.changeColumn('AgreementItemPrice', 'totalPrice', {
        type: Sequelize.DECIMAL(10,2)
      }),
      queryInterface.changeColumn('Agreement', 'totalPurchasePrice', {
        type: Sequelize.DECIMAL(10,2)
      }),
      queryInterface.changeColumn('Agreement', 'due', {
        type: Sequelize.DECIMAL(10,2)
      }),
      queryInterface.changeColumn('Agreement', 'totalCashPrice', {
        type: Sequelize.DECIMAL(10,2)
      }),
      queryInterface.changeColumn('Agreement', 'totalPrice', {
        type: Sequelize.DECIMAL(10,2)
      }),
      queryInterface.changeColumn('Agreement', 'totalTax', {
        type: Sequelize.DECIMAL(10,2)
      }),
      queryInterface.changeColumn('AgreementAdjustment', 'amount', {
        type: Sequelize.DECIMAL(10,2)
      }),
      queryInterface.changeColumn('ChangeLog', 'totalPrice', {
        type: Sequelize.DECIMAL(10,2)
      })
    ])
  }
};
