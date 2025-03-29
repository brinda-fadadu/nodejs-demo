'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Agreement', 'propertyPaidInFullDate', {
      type: Sequelize.DATE
    })
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Agreement', 'propertyPaidInFullDate')
  }
};
