'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
      return queryInterface.addColumn('AgreementItem', 'reservationStatus', {
        type: Sequelize.STRING
      })
  
  },

  down: (queryInterface, Sequelize) => {
      return queryInterface.addColumn('AgreementItem', 'reservationStatus', {
        type: Sequelize.STRING
      })

  }
};
