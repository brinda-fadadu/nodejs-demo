'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('DecedentAndCremationDetails', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      workOrderId: {
        type: Sequelize.INTEGER
      },
      weightOver: {
        type: Sequelize.BOOLEAN
      },
      witness: {
        type: Sequelize.BOOLEAN
      },
      witnessCount: {
        type: Sequelize.INTEGER
      },
      expedite: {
        type: Sequelize.BOOLEAN
      },
      deletedAt: {
        type: Sequelize.DATE
      },
      deletedBy: {
        type: Sequelize.INTEGER
      },
      createdBy: {
        type: Sequelize.INTEGER
      },
      replacedBy: {
        type: Sequelize.INTEGER
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
      tableName: 'DecedentAndCremationDetails'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('DecedentAndCremationDetails');
  }
};