'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.changeColumn('AgreementAdjustment', 'maxDiscount', {
        type: Sequelize.DECIMAL(20, 8)
      })
    ])
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.changeColumn('AgreementAdjustment', 'maxDiscount', {
        type: Sequelize.DECIMAL(10, 2)
      })
    ])
  }
}
