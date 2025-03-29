'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    const crematoryRetorts = require('./crematory-retorts.json')
    return queryInterface.bulkInsert(
      'CrematoryRetorts',
      crematoryRetorts,
      {},
      {
        id: {
          autoIncrement: true
        }
      }
    )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('CrematoryRetorts', null, { truncate: true })
  }
}
