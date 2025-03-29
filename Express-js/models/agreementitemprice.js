'use strict';
module.exports = (sequelize, DataTypes) => {
  const AgreementItemPrice = sequelize.define('AgreementItemPrice', {
    quantity: DataTypes.INTEGER,
    unitPrice: DataTypes.DECIMAL(10, 2),
    ecfAmount: DataTypes.DECIMAL(10, 2),
    unitTax: DataTypes.DECIMAL(10, 2),
    totalPrice: DataTypes.DECIMAL(20, 2),
    totalECFAmount: DataTypes.DECIMAL(10, 2),
    totalTax: DataTypes.DECIMAL(10, 2)
  }, {
    tableName: 'AgreementItemPrice',
    timestamps: false
  });
  AgreementItemPrice.associate = function (models) {

  };
  return AgreementItemPrice;
};