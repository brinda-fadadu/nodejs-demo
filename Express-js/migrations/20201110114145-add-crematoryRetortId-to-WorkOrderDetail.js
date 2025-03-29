'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('WorkOrderDetail', 'crematoryRetortId', {
      type: Sequelize.INTEGER
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('WorkOrderDetail', 'crematoryRetortId')
  }
};