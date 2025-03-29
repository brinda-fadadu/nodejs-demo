'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    let data = [
      {
        id: 1,
        status: 'Selected'
      },
      {
        id: 2,
        status: 'Used'
      }
    ]
    return queryInterface.bulkInsert(
      'ItemUsageStatus',
      data,
      {},
      {
        id: {
          autoIncrement: true
        }
      }
    )
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('ItemUsageStatus', null, {
      truncate: true
    })
  }
}
