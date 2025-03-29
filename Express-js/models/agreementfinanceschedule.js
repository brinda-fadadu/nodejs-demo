'use strict';
module.exports = (sequelize, DataTypes) => {
  const AgreementFinanceSchedule = sequelize.define('AgreementFinanceSchedule', {
    agreementFinanceId: DataTypes.INTEGER,
    expectedPaymentDate: DataTypes.DATE,
    expectedPaymentAmount: DataTypes.DECIMAL(10, 2),
    paymentIndex: DataTypes.INTEGER,
    principal: DataTypes.DECIMAL(10, 2), // null, in case of special financing (uneven)
    interest: DataTypes.DECIMAL(10, 2), // null, in case of special financing (uneven)
    balance: DataTypes.DECIMAL(10, 2), // for financing, this would be remainingPrincipal after that month's payment ...
    // for special financing (uneven), this would be total amount after that month's payment (regardless of principal, interest)
    remainingInterestToBePaid: DataTypes.DECIMAL(10, 2),
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER
  }, {
    tableName: 'AgreementFinanceSchedule',
    timestamps: true
  });

  AgreementFinanceSchedule.associate = function(models) {
    // associations can be defined here
    AgreementFinanceSchedule.hasOne(models.AgreementFinanceSchedulePayment, { foreignKey: 'agreementFinanceScheduleId', as: 'schedulePayment' })
  };
  return AgreementFinanceSchedule;
};