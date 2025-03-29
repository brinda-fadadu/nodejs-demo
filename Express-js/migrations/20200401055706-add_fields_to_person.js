'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('Person', 'preferredFirstName',{
        type: Sequelize.STRING
      }),
      queryInterface.addColumn('Person', 'preferredMiddleName', {
        type: Sequelize.STRING
      }),
      queryInterface.addColumn('Person', 'preferredLastName', {
        type: Sequelize.STRING
      })
    ])
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('Person', 'preferredFirstName'),
      queryInterface.removeColumn('Person', 'preferredMiddleName'),
      queryInterface.removeColumn('Person', 'preferredLastName')
    ])
  }
};
