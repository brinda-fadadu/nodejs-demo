'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Item', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      code: {
        type: Sequelize.STRING
      },
      name: {
        type: Sequelize.STRING
      },
      description: {
        type: Sequelize.STRING
      },
      cost: {
        type: Sequelize.DECIMAL(10, 2)
      },
      isTaxable: {
        type: Sequelize.BOOLEAN
      },
      isActive: {
        type: Sequelize.BOOLEAN
      },
      serviceType: {
        type: Sequelize.INTEGER
      },
      vendorId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Vendor',
          key: 'id'
        }
      },
      itemStatusId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'ItemStatus',
          key: 'id'
        }
      },
      itemCategoryId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'ItemCategory',
          key: 'id'
        }
      },
      isSchedulable: {
        type: Sequelize.BOOLEAN
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    }, {
      tableName:'Item'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Item');
  }
};