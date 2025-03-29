'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      return Promise.all([
        queryInterface.addColumn('Quotation', 'quotationNumber', {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        }),
        queryInterface.addConstraint('Quotation', ['quotationNumber'], {
          type: 'unique',
          name: 'quotation_number_constraint',
        })
      ])
    } catch (error) {
      console.log(error)
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      return Promise.all([
        queryInterface.removeConstraint('Quotation', 'quotation_number_constraint'),
        queryInterface.removeColumn('Quotation', 'quotationNumber')
      ])
    } catch (error) {
      console.log(error)
    }
  }
};
