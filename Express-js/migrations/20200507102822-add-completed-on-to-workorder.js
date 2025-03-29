'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    try {
      return Promise.all([
        queryInterface.addColumn('WorkOrder', 'completedOn', {
          type: Sequelize.DATE
        }),
      ])
    } catch (error) {
      console.log(error)      
    }
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('WorkOrder', 'completedOn'),
    ])
  }
};
