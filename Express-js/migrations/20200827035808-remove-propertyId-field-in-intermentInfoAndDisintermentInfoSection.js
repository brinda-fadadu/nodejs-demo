'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('IntermentInformationSection', 'propertyId'),
      queryInterface.removeColumn('DisintermentInfoSection', 'propertyId')
    ])
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('IntermentInformationSection', 'propertyId', {
        type: Sequelize.INTEGER
      }),
      queryInterface.addColumn('DisintermentInfoSection', 'propertyId', {
        type: Sequelize.INTEGER
      })
    ])
  }
};
