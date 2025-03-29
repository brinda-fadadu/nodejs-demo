'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('IntermentInformationSection', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      propertyId: {
        type: Sequelize.INTEGER
      },
      beginningTime: {
        type: Sequelize.DATE
      },
      endingTime: {
        type: Sequelize.DATE
      },
      temporaryBurialLocationId: {
        type: Sequelize.INTEGER
      },
      temporaryDisintermentLocationId: {
        type: Sequelize.INTEGER
      },
      memorialInformation: {
        type: Sequelize.STRING(512)
      }
    },{
      tableName: 'IntermentInformationSection'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('IntermentInformationSection');
  }
};