'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Call', 'assignedToId')
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Call', 'assignedToId', {
      type: Sequelize.DATE
    })
  }
};
