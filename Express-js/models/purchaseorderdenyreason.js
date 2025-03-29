'use strict';
module.exports = (sequelize, DataTypes) => {
  const PurchaseOrderDenyReason = sequelize.define('PurchaseOrderDenyReason', {
    name: DataTypes.STRING
  },  {
    timestamps: false,
    tableName: 'PurchaseOrderDenyReason'
  });
  PurchaseOrderDenyReason.associate = function(models) {
    // associations can be defined here
  };
  return PurchaseOrderDenyReason;
};