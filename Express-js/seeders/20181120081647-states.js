'use strict'
const csv = require('csvtojson')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const states = await csv().fromFile(process.cwd()+'/seeders/states.csv')        
      return queryInterface.bulkInsert('State', states, {
        logging: console.log
      }, {
        id: {
          autoIncrement: true
        }
      })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('State', null, {})
  }
}
