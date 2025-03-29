'use strict';

module.exports = (sequelize, DataTypes) => {
  const HmisDownSyncPaymentLog = sequelize.define('HmisDownSyncPaymentLog', {
    referenceNumber: DataTypes.STRING,
    receiptNumber: DataTypes.STRING,
    agreementId: DataTypes.INTEGER,
    hmisSalesId: DataTypes.INTEGER,
    salesDownPymtId: DataTypes.INTEGER,
    salesCashApplicationId: DataTypes.INTEGER,
    contractNumber: DataTypes.STRING,
    cashReceiptId: DataTypes.INTEGER,
    amount: DataTypes.DECIMAL(10, 2),
    paymentType: DataTypes.INTEGER,
    paymentStatus: DataTypes.STRING,
    cashCreatedAt: DataTypes.INTEGER,
    synced: DataTypes.INTEGER,
    salesDownPymtNbr: DataTypes.STRING,
    CashReceiptNbr: DataTypes.STRING,
    otherInfo: DataTypes.STRING
  }, {
    tableName: 'HmisDownSyncPaymentLog',
    timestamps: true
  });
  HmisDownSyncPaymentLog.associate = function(models) {
    // associations can be defined here
  };
  return HmisDownSyncPaymentLog;
};
