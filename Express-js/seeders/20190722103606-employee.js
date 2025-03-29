'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const employeeTypes = require('./Employee-Type.json')
    const employees = require('./employee.json')
      await queryInterface.bulkInsert('EmployeeType', employeeTypes, 
      {
        logging: console.log
      }, {
        id: {
          autoIncrement: true
        }
      })
      await queryInterface.bulkInsert('Employee', employees, {
        logging: console.log
      }, {
        id: {
          autoIncrement: true
        }
      })
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.bulkDelete('EmployeeType', null, {}),
      queryInterface.bulkDelete('Employee', null, {})
    ])
  }
};
