'use strict';

const businessUnits = require('./businessUnits.json')
module.exports = {
  up: async(queryInterface, Sequelize) => {
      let inputPayload = businessUnits.map(businessUnit => {
        let inputdata = {
          name : businessUnit['name'],
          createdAt : new Date(),
          updatedAt : new Date()
        }
        return inputdata
      })
    return queryInterface.bulkInsert('BusinessUnit', inputPayload, {
    },{
      id: {
        autoIncrement: true
      }
      })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('BusinessUnit', {}, {
      truncate: true
    })
  }
};
