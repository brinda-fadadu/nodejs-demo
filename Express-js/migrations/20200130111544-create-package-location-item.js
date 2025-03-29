'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('PackageLocationItem', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      packageId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Package',
          key: 'id'
        }
      },
      quantity:{
        type: Sequelize.INTEGER
      },
      isActive: {
        type: Sequelize.BOOLEAN
      },
      locationItemId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'LocationItem',
          key: 'id'
        }
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('getdate()')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('getdate()')
      },
    },{
      tableName:'PackageLocationItem',
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('PackageLocationItem');
  }
};