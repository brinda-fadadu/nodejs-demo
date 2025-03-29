'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('MemorialSpec', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      memorialTypeAttributeValueId: {
        type: Sequelize.INTEGER
      },
      memorialSizeAttributeValueId: {
        type: Sequelize.INTEGER
      },
      itemCategoryAttributeValueId: {
        type: Sequelize.INTEGER
      }
    }, {
      tableName:'MemorialSpec'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('MemorialSpec');
  }
};