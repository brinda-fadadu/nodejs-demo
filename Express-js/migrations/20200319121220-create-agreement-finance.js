'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('AgreementFinance', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      agreementId: {
        type: Sequelize.INTEGER
      },
      downPaymentPercent: {
        type: Sequelize.DECIMAL(10, 2)
      },
      interestRate: {
        type: Sequelize.DECIMAL(10, 2)
      },
      interestAmount: {
        type: Sequelize.DECIMAL(10, 2)
      },
      financedAmount: {
        type: Sequelize.DECIMAL(10, 2)
      },
      totalAmount: {
        type: Sequelize.DECIMAL(10, 2)
      },
      tenureMonths: {
        type: Sequelize.INTEGER
      },
      createdBy: {
        type: Sequelize.INTEGER
      },
      updatedBy: {
        type: Sequelize.INTEGER
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
      tableName: 'AgreementFinance'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('AgreementFinance');
  }
};