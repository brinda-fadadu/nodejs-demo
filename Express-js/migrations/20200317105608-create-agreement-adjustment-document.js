'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('AgreementAdjustmentDocument', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      agreementAdjustmentId: {
        type: Sequelize.INTEGER
      },
      fileUrl: {
        type: Sequelize.STRING
      }
    },{
      tableName: 'AgreementAdjustmentDocument'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('AgreementAdjustmentDocument');
  }
};