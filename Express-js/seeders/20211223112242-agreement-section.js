'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert(
      'AgreementSection',
      [
        {
          id: 8,
          area: 'Memorial'
        }
      ],
      { logging: console.log },
      {
        id: {
          autoIncrement: true
        }
      }
    )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('AgreementSection', null, {})
  }
}
