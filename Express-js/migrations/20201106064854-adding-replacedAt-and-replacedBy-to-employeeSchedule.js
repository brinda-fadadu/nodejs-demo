'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('EmployeeSchedule', 'replacedAt', {
        type: Sequelize.DATE
      }),
      queryInterface.addColumn('EmployeeSchedule', 'replacedBy', {
        type: Sequelize.INTEGER
      })
    ])
  },

  down: (queryInterface, Sequelize) => {
   return Promise.all([
     queryInterface.removeColumn('EmployeeSchedule', 'replacedAt'),
     queryInterface.removeColumn('EmployeeSchedule', 'replacedBy')
   ])
  }
};