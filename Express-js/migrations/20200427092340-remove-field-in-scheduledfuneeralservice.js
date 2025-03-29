'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('ScheduledFuneralService', 'subServiceSectionId')
    ])
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('ScheduledFuneralService', 'subServiceSectionId', {
        type: Sequelize.INTEGER
      })
    ])
  }
};
