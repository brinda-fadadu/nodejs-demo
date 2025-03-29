'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Partners', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      partnerName: {
        type: Sequelize.STRING
      },
      contactId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Person',
          key: 'id'
        }
      },
      addressPlaceId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Place',
          key: 'id'
        }
      },
      discountType: {
        type: Sequelize.INTEGER
      },
      discountValue: {
        type: Sequelize.DOUBLE
      },
      isActive: {
        type: Sequelize.BOOLEAN
      },
      documentUrl: {
        type: Sequelize.STRING
      },
      createdBy: {
        type: Sequelize.INTEGER,
        references: {
          model: 'User',
          key: 'id'
        }
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        references: {
          model: 'User',
          key: 'id'
        }
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
      tableName: 'Partners'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Partners');
  }
};