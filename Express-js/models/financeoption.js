'use strict';
module.exports = (sequelize, DataTypes) => {
  const FinanceOption = sequelize.define('FinanceOption', {
    downPaymentPercent: DataTypes.DOUBLE,
    interestRate: DataTypes.DOUBLE,
    tenureMonths: DataTypes.INTEGER
  }, {
    tableName: 'FinanceOption',
    timestamps: false
  });
  FinanceOption.associate = function(models) {
    // associations can be defined here
  };
  return FinanceOption;
};