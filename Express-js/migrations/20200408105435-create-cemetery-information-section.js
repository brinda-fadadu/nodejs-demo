'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('CemeteryInformationSection', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      clCemeteryLocationId: {
        type: Sequelize.INTEGER
      },
      cemeteryLocationId: {
        type: Sequelize.INTEGER
      },
      burialSite: {
        type: Sequelize.STRING
      }
    }, {
      tableName: 'CemeteryInformationSection'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('CemeteryInformationSection');
  }
};