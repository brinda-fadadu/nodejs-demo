'use strict';

const teams = require('./user-teams.json')
module.exports = {
  up: async(queryInterface, Sequelize) => {
      let inputPayload = teams.map(team => {
        let inputdata = {
          code : team['code'],
          name : team['name'],
          createdAt : new Date(),
          updatedAt : new Date()
        }
        return inputdata
      })
    return queryInterface.bulkInsert('Team', inputPayload, {
    },{
      id: {
        autoIncrement: true
      }
      })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Team', {}, {
      truncate: true
    })
  }
};