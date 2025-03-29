'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('ScheduledCemeteryService', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      personId: {
        type: Sequelize.INTEGER
      },
      itemUsageId: {
        type: Sequelize.INTEGER
      },
      intermentInformationSectionId: {
        type: Sequelize.INTEGER
      },
      disintermentInfoSectionId: {
        type: Sequelize.INTEGER
      },
      intermentRequestSectionId: {
        type: Sequelize.INTEGER
      },
      vaultSectionId: {
        type: Sequelize.INTEGER
      },
      casketSectionId: {
        type: Sequelize.INTEGER
      },
      urnInformationSectionId: {
        type: Sequelize.INTEGER
      },
      merchandiseAdditionalInfoSectionId: {
        type: Sequelize.INTEGER
      },
      genericSectionId: {
        type: Sequelize.INTEGER
      },
      funeralArrangementSectionId: {
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
    },{
      tableName: 'ScheduledCemeteryService'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('ScheduledCemeteryService');
  }
};