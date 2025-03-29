'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert(
      'AgreementRole',
      [
        { id: 1, name: 'Purchaser'},
        { id: 2, name: 'Co-purchaser'},
        { id: 3, name: 'Beneficiary'},
        { id: 4, name: 'Payor'}
        ],
      {},{
        id:{
          autoIncrement:true
        }
      }
    )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('AgreementRole', null, {})
  }
}