'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert(
      'ActionReason',
      [
        { id: 1, action: 'DELETE', reason: 'Caller decided on other facility' },
        { id: 2, action: 'DELETE', reason: 'Cannot connect with Caller' },
        { id: 3, action: 'DELETE', reason: 'PN turn AN – Transfer to other facility' },
        { id: 4, action: 'DELETE', reason: 'Pricing does not match expectations' },
        { id: 5, action: 'DELETE', reason: 'Facilities does not meet expectations' },
        { id: 6, action: 'DELETE', reason: 'Service requested not part of offerings' }
      ],
      {},{
        id:{
          autoIncrement:true
        }
      }
    )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('ActionReason', null, {})
  }
}
