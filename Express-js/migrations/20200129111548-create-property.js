'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Property', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      price: {
        type: Sequelize.DOUBLE
      },
      ecfAmount: {
        type: Sequelize.DOUBLE
      },
      total: {
        type: Sequelize.DOUBLE
      },
      propertyItemCode: {
        type: Sequelize.STRING
      },
      lotSellUnitId: {
        type: Sequelize.STRING
      },
      propertyGardenId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'PropertyGarden',
          key: 'id'
        }
      },
      propertyTypeId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'PropertyType',
          key: 'id'
        }
      },
      reservationStatus: {
        type: Sequelize.STRING
      },
      updatedBy: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: true,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: true,
        type: Sequelize.DATE
      }
    },{
      tableName:'Property'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Property');
  }
};