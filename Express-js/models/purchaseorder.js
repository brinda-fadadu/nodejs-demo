'use strict';
module.exports = (sequelize, DataTypes) => {
  const PurchaseOrder = sequelize.define('PurchaseOrder', {
    agreementLocationItemId: DataTypes.INTEGER,
    agreementPackageId: DataTypes.INTEGER,
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
    deletedBy: DataTypes.INTEGER,
    agreementMemorialId: DataTypes.INTEGER,
    agreementCashAdvanceItemId: DataTypes.INTEGER
  }, {
    timestamps: true,
    tableName: 'PurchaseOrder'
  });
  PurchaseOrder.associate = function(models) {
    // associations can be defined here
    PurchaseOrder.belongsTo(models.AgreementLocationItem, {
      foreignKey: 'agreementLocationItemId',
      as: 'agreementLocationItem'
    })

    PurchaseOrder.belongsTo(models.AgreementPackage, {
      foreignKey: 'agreementPackageId',
      as: 'agreementPackage'
    })

    PurchaseOrder.belongsTo(models.AgreementMemorial, {
      foreignKey: 'agreementMemorialId',
      as: 'agreementMemorial'
    })

    PurchaseOrder.hasMany(models.PurchaseOrderItem, {foreignKey: 'purchaseOrderId', as: 'purchaseOrderItems'})

    PurchaseOrder.addScope('notDeleted', {
      where: {
        deletedAt: null,
        deletedBy: null
      }
    })
  };
  return PurchaseOrder;
};