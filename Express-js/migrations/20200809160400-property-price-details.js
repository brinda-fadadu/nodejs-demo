'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
      await queryInterface.addColumn('Property', 'price2', Sequelize.DOUBLE)
      await queryInterface.addColumn('Property', 'price3', Sequelize.DOUBLE)
      return true
  },

  down: async (queryInterface, Sequelize) => {
      await queryInterface.removeColumn('Property', 'price2')
      await queryInterface.removeColumn('Property', 'price3')
      return true
  }
};
