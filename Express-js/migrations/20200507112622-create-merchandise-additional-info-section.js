'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('MerchandiseAdditionalInfoSection', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      isVasesSelected: {
        type: Sequelize.BOOLEAN
      },
      noOfVases: {
        type: Sequelize.INTEGER
      },
      instruction: {
        type: Sequelize.TEXT
      }
    },{
      tableName: 'MerchandiseAdditionalInfoSection'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('MerchandiseAdditionalInfoSection');
  }
};