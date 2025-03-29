'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('Person', 'birthState', Sequelize.STRING),
      queryInterface.addColumn('Person', 'birthCountry', Sequelize.STRING),
    ])
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('Person', 'birthState'),
      queryInterface.removeColumn('Person', 'birthCountry'),
    ])
  }
};
