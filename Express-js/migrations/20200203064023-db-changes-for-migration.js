'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('Location', 'tax', {
        type: Sequelize.DECIMAL(10, 2)
      }),
      queryInterface.addColumn('Location', 'license', {
        type: Sequelize.STRING
      }),
      queryInterface.addColumn('Location', 'fax', {
        type: Sequelize.STRING
      })
    ])
  },

  down: (queryInterface, Sequelize) => {
   return Promise.all([
     queryInterface.removeColumn('Location', 'tax'),
     queryInterface.removeColumn('Location', 'license'),
     queryInterface.removeColumn('Location', 'fax')
   ])
  }
};