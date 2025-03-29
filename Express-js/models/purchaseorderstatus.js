'use strict';
module.exports = (sequelize, DataTypes) => {
  const PurchaseOrderStatus = sequelize.define('PurchaseOrderStatus', {
    name: DataTypes.STRING
  }, {
    timestamps: false,
    tableName: 'PurchaseOrderStatus'
  });
  PurchaseOrderStatus.associate = function(models) {
    // associations can be defined here
  };
  return PurchaseOrderStatus;
};