'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('IntermentRights', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      propertyTypeId: {
        type: Sequelize.INTEGER
      },
      propertyCampusId: {
        type: Sequelize.INTEGER
      },
      graves: {
        type: Sequelize.INTEGER
      },
      rights: {
        type: Sequelize.INTEGER
      },
      maxRights: {
        type: Sequelize.INTEGER
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('IntermentRights');
  }
};