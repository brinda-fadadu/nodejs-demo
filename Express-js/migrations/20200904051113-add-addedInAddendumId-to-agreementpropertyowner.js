'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('AgreementPropertyOwner', 'addedInAddendumId', {
      type: Sequelize.INTEGER
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('AgreementPropertyOwner', 'addedInAddendumId')
  }
};

