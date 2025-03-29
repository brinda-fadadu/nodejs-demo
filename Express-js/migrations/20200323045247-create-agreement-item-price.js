'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('AgreementItemPrice', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      quantity: {
        type: Sequelize.INTEGER
      },
      unitPrice: {
        type: Sequelize.DECIMAL(10,2)
      },
      unitTax: {
        type: Sequelize.DECIMAL(10,2)
      },
      totalPrice: {
        type: Sequelize.DECIMAL(10,2)
      },
      totalTax: {
        type: Sequelize.DECIMAL(10,2)
      }      
    },{
      tableName: 'AgreementItemPrice'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('AgreementItemPrice');
  }
};