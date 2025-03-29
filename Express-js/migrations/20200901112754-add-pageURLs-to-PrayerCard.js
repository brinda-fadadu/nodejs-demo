'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('PrayerCard', 'frontPageURL', Sequelize.STRING),
      queryInterface.addColumn('PrayerCard', 'backPageURL', Sequelize.STRING),
      queryInterface.removeColumn('PrayerCard', 'fileURL'),
    ])
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('PrayerCard', 'frontPageURL'),
      queryInterface.removeColumn('PrayerCard', 'backPageURL'),
      queryInterface.addColumn('PrayerCard', 'fileURL', Sequelize.STRING),
    ])
  }
};
