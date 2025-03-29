'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('AgreementItemCategoryMapper', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      agreementItemMapperId: {
        type: Sequelize.INTEGER
      },
      itemCategoryId: {
        type: Sequelize.INTEGER
      }
    }, {
      tableName:'AgreementItemCategoryMapper'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('AgreementItemCategoryMapper');
  }
};