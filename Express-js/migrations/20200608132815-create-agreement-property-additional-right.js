'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('AgreementPropertyAdditionalRight', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      agreementPropertyId: {
        type: Sequelize.INTEGER
      },
      agreementId: {
        type: Sequelize.INTEGER
      },
      addendumId: {
        type: Sequelize.INTEGER
      },
      lotSpaceId: {
        type: Sequelize.INTEGER
      },
      agreementItemPriceId: {
        type: Sequelize.INTEGER
      },
      createdBy: {
        type: Sequelize.INTEGER
      },
      deletedBy: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        type: Sequelize.DATE
      },
      deletedAt: {
        type: Sequelize.DATE
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('AgreementPropertyAdditionalRight');
  }
};