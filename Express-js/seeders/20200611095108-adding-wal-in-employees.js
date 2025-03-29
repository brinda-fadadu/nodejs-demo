'use strict'
const models = require('../models')

const employees = [
  {
    name: 'Naman',
    email: 'naman@gmail.com',
    employeeTypeId: 4,
    "isActive":1
  },
  {
    name: 'Venu',
    email: 'venu@gmail.com',
    employeeTypeId: 4,
    "isActive":1
  },
  {
    name: 'HariKrishna',
    email: 'harikrishna@gmail.com',
    employeeTypeId: 4,
    "isActive":1
  },
  {
    name: 'Vedavyas',
    email: 'vedavyas@gmail.com',
    employeeTypeId: 4,
    "isActive":1
  },
  {
    name: 'Emmanuel',
    email: 'emmanuel@gmail.com',
    employeeTypeId: 4,
    "isActive":1
  },
  {
    name: 'Tejasree',
    email: 'tejasree@gmail.com',
    employeeTypeId: 4,
    "isActive":1
  },
  {
    name: 'Divyasri',
    email: 'divyasri@gmail.com',
    employeeTypeId: 4,
    "isActive":1
  },
  {
    name: 'Praveen',
    email: 'praveen@gmail.com',
    employeeTypeId: 4,
    "isActive":1
  },
  {
    name: 'Srini',
    email: 'srini@gmail.com',
    employeeTypeId: 4,
    "isActive":1
  }
]

module.exports = {
  up: (queryInterface, Sequelize) => {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.bulkInsert('People', [{
        name: 'John Doe',
        isBetaMember: false
      }], {});
    */
    if (process.env.NODE_ENV !== 'UAT') {
      return models.Employee.bulkCreate(employees)
    }
  },

  down: (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.bulkDelete('People', null, {});
    */
    if (process.env.NODE_ENV !== 'UAT') {
      return models.Employee.destroy({
        where: {
          email: employees.map(emp=>emp.email)
        }
      })
    }
  }
}
