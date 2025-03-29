'use strict';
const models = require('../models')

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
     return models.Employee.create({
       name: 'name',
       email: 'a@gmail.com',
       isActive: 1,
       employeeTypeId: 4,
       location: 'CFS'
     })
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
      email: 'a@gmail.com',
     }
    })
  }
  }
};
