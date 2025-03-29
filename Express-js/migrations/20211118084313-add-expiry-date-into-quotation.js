'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Quotation', 'expiryDate', {
      type: Sequelize.DATE
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Quotation', 'expiryDate', {
      type: Sequelize.DATE
    })
  }
}
