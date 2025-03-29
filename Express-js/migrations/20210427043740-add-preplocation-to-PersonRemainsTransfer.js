'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
     return queryInterface.addColumn('PersonRemainsTransfer', 'transferToPrepLocationId', {
        type: Sequelize.INTEGER,
        references: {
          model: 'Location',
          key: 'id'
        }
      })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('PersonRemainsTransfer', 'transferToPrepLocationId')
  }
};
