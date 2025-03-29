'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('FamilyArranger', 'isFaaLocked', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      }),
      queryInterface.addColumn('FamilyArranger', 'decedentId', {
        type: Sequelize.INTEGER
      }),
      queryInterface.addColumn('FamilyArranger', 'onePortalId', {
        type: Sequelize.STRING
      })
    ])
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('FamilyArranger', 'isFaaLocked'),
      queryInterface.removeColumn('FamilyArranger', 'decedentId'),
      queryInterface.removeColumn('FamilyArranger', 'onePortalId')
    ])
  }
};
