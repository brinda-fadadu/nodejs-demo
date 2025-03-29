'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.createTable('users', { id: Sequelize.INTEGER });
    */
    return Promise.all([
      queryInterface.addColumn('Property', 'developedDt', Sequelize.STRING),
      queryInterface.addColumn('Property', 'preDeveloped', Sequelize.BOOLEAN)
    ])
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('Property', 'developedDt'),
      queryInterface.removeColumn('Property', 'preDeveloped')
    ])
  }
};
