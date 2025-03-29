'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('ScheduledFuneralService', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      personId: {
        type: Sequelize.INTEGER
      },
      agreementLocationItemId: {
        type: Sequelize.INTEGER
      },
      agreementPackageItemId: {
        type: Sequelize.INTEGER
      },
      schedulingSectionId: {
        type: Sequelize.INTEGER
      },
      cemeteryInformationSectionId: {
        type: Sequelize.INTEGER
      },
      resourceSectionId: {
        type: Sequelize.INTEGER
      },
      subServiceSectionId: {
        type: Sequelize.INTEGER
      },
      casketSectionId: {
        type: Sequelize.INTEGER
      },
      urnInformationSectionId: {
        type: Sequelize.INTEGER
      },
      createdBy: {
        type: Sequelize.INTEGER
      },
      updatedBy: {
        type: Sequelize.INTEGER
      },
      deletedBy: {
        type: Sequelize.INTEGER
      },
      deletedAt: {
        type: Sequelize.DATE
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    }, {
      tableName: 'ScheduledFuneralService'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('ScheduledFuneralService');
  }
};