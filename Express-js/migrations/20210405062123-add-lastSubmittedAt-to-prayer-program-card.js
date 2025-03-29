'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('Program', 'lastSubmittedAt', {
        type: Sequelize.DATE
      }),
      queryInterface.addColumn('PrayerCard', 'lastSubmittedAt', {
        type: Sequelize.DATE
      }),
      queryInterface.addColumn('PrayerCard', 'isCustom', {
        type: Sequelize.BOOLEAN
      }),
    ])
  },

  down: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('Program', 'lastSubmittedAt'),
      queryInterface.removeColumn('PrayerCard', 'lastSubmittedAt'),
      queryInterface.removeColumn('PrayerCard', 'isCustom'),
    ])
  }
};
