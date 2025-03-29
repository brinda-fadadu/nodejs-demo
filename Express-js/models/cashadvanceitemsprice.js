'use strict';
module.exports = (sequelize, DataTypes) => {
  const CashAdvanceItemsPrice = sequelize.define('CashAdvanceItemsPrice', {
    itemId: DataTypes.INTEGER,
    countyId: DataTypes.INTEGER,
    price: DataTypes.DECIMAL(10, 2)
  }, {
    tableName: 'CashAdvanceItemsPrice',
    timestamps: false
  });
  CashAdvanceItemsPrice.associate = function(models) {
    // associations can be defined here
  };
  return CashAdvanceItemsPrice;
};