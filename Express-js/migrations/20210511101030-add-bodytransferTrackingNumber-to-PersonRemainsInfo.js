'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('PersonRemainsInfo', 'bodyTransferTrackingNumber', {
      type: Sequelize.STRING
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('PersonRemainsInfo', 'bodyTransferTrackingNumber')
  }
};
