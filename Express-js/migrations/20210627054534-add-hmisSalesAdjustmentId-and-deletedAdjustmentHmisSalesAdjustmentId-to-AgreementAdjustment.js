'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('AgreementAdjustment', 'hmisSalesAdjustmentId',{
        type: Sequelize.INTEGER
      }),
      queryInterface.addColumn('AgreementAdjustment', 'deletedAdjustmentHmisSalesAdjustmentId', {
        type: Sequelize.INTEGER
      })
    ]) 
  },
  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('AgreementAdjustment', 'hmisSalesAdjustmentId'),
      queryInterface.removeColumn('AgreementAdjustment', 'deletedAdjustmentHmisSalesAdjustmentId')
    ])
  }
};