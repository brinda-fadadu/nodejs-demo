'use strict';
module.exports = (sequelize, DataTypes) => {
  const PaymentCounter = sequelize.define('PaymentCounter', {
    receiptNumberPrefix: DataTypes.STRING,
    value: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
  }, {
    tableName: 'PaymentCounter',
    timeStamps: true
  });
  PaymentCounter.associate = function(models) {
    // associations can be defined here
  };
  return PaymentCounter;
};
