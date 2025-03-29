'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('Property', 'pnDiscountValue', Sequelize.DECIMAL(10, 2)),
      queryInterface.addColumn('Property', 'preDevelopedDiscountValue', Sequelize.DECIMAL(10, 2)),
    ])
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('Property', 'pnDiscountValue'),
      queryInterface.removeColumn('Property', 'preDevelopedDiscountValue'),
    ])
  }
};
