'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('Payment', 'voidedCashReceiptId', {
      type: Sequelize.INTEGER
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('Payment', 'voidedCashReceiptId', {
      type: Sequelize.STRING
    })
  }
};
