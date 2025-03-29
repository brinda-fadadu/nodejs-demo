'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('UrnInformationSection', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      urnId: {
        type: Sequelize.INTEGER
      },
      isFamilyOwnedUrn: {
        type: Sequelize.BOOLEAN
      },
      height: {
        type: Sequelize.STRING
      },
      width: {
        type: Sequelize.STRING
      },
      depth: {
        type: Sequelize.STRING
      },
      urnType: {
        type: Sequelize.INTEGER
      },
      urnStatus: {
        type: Sequelize.STRING
      },
      receivedDate: {
        type: Sequelize.DATE
      },
      isTransferRequired: {
        type: Sequelize.BOOLEAN
      }
    }, {
      tableName: 'UrnInformationSection'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('UrnInformationSection');
  }
};