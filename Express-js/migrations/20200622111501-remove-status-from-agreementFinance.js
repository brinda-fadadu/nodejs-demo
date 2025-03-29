'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('AgreementFinance', 'status')
    ])
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('AgreementFinance', 'status', {
        type: Sequelize.STRING
      })
    ])
  }
};
