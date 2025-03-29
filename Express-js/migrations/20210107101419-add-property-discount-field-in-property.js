'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Property', 'pnPropertyDiscount', {
      type: Sequelize.DECIMAL(10, 2)
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Property', 'pnPropertyDiscount')
  }
};
