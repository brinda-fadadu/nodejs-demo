'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    const vehicles = require('./vehicles.json')
    return queryInterface.bulkInsert(
      'Vehicles',
      vehicles,
      {},
      {
        id: {
          autoIncrement: true
        }
      }
    )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Vehicles', null, { truncate: true })
  }
}
