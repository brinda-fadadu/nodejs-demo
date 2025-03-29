'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('AgreementItemPrice', 'ecfAmount', {
        type: Sequelize.DECIMAL(10, 2)
      }),
      queryInterface.addColumn('AgreementItemPrice', 'totalECFAmount', {
        type: Sequelize.DECIMAL(10, 2)
      })
    ])
  },

  down: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('AgreementItemPrice', 'ecfAmount'),
      queryInterface.removeColumn('AgreementItemPrice', 'totalECFAmount')
    ])
  }
};
