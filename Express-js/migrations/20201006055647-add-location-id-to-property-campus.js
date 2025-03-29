'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('PropertyCampus', 'locationId', {
      type: Sequelize.INTEGER,
      references: {
        model: 'Location',
        key: 'id'
      }
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('PropertyCampus', 'locationId')
  }
};

