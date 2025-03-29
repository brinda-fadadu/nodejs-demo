'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('MemorialAddOnSpec', {
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
      addOnItemCategoryId: {
        type: Sequelize.INTEGER
      },
      addOnTypeAttributeValueId: {
        type: Sequelize.INTEGER
      },
      addOnAttributeValueIds: {
        type: Sequelize.STRING
      },
    }, {
      tableName:'MemorialAddOnSpec'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('MemorialAddOnSpec');
  }
};