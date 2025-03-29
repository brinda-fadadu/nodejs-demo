'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('ReservedResource', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      resourceType: {
        type: Sequelize.STRING
      },
      resourceId: {
        type: Sequelize.INTEGER
      },
      reservationDate: {
        type: Sequelize.DATE
      },
      startTime: {
        type: Sequelize.DATE
      },
      endTime: {
        type: Sequelize.DATE
      },
      blockStartTime: {
        type: Sequelize.DATE
      },
      blockEndTime: {
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
      tableName: 'ReservedResource'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('ReservedResource');
  }
};