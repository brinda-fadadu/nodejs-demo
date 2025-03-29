'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('PersonRemainsInfo', 'finalRestingPlace', {
      type: Sequelize.STRING
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('PersonRemainsInfo', 'finalRestingPlace')
  }
};