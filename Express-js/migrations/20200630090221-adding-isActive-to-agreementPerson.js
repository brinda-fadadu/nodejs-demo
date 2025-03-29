'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('AgreementPerson', 'isActive', {
        type: Sequelize.BOOLEAN
      })
    ])
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('AgreementPerson', 'isActive')
    ])
  }
};
