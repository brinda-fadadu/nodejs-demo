'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('LotSpace', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      lotSpaceId: {
        type: Sequelize.INTEGER
      },
      lotSellUnitId: {
        type: Sequelize.INTEGER
      },
      sequence: {
        type: Sequelize.INTEGER
      },
      location: {
        type: Sequelize.STRING
      },
      cemeteryCode: {
        type: Sequelize.STRING
      },
      sectionCode: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    },{
      tableName: 'LotSpace'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('LotSpace');
  }
};