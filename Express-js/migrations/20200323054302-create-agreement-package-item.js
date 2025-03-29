'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('AgreementPackageItem', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      agreementPackageId: {
        type: Sequelize.INTEGER
      },
      locationItemId: {
        type: Sequelize.INTEGER
      }
    },{
      tableName: 'AgreementPackageItem'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('AgreementPackageItem');
  }
};