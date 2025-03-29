'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('AgreementAdjustment', 'maxDiscount', {
      type: Sequelize.DECIMAL(10,2)
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('AgreementAdjustment', 'maxDiscount')
  }
};