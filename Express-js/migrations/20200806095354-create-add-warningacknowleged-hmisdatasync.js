'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('HMISDataSync', 'warningsAcknowledged', {
      type: Sequelize.BOOLEAN
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('HMISDataSync', 'warningsAcknowledged')
  }
};
