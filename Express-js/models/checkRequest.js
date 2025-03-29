'use strict';
module.exports = (sequelize, DataTypes) => {
  const CheckRequest = sequelize.define('CheckRequest', {
    agreementCashAdvancedItemId: DataTypes.INTEGER,
    status: DataTypes.STRING,
    vendorId: DataTypes.INTEGER,
    processedTime: DataTypes.DATE,
    voidedTime: DataTypes.DATE,
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
    deletedBy: DataTypes.INTEGER,
    vendorPrice: DataTypes.DECIMAL(10,2)
  }, {
    tableName: 'CheckRequest',
    timestamps: true
  });
  CheckRequest.associate = function (models) {
    CheckRequest.belongsTo(models.AgreementCashAdvancedItem, { foreignKey: 'agreementCashAdvancedItemId', as: 'agreementCashAdvancedItem' })
    CheckRequest.belongsTo(models.User, {foreignKey: 'createdBy'});
    CheckRequest.belongsTo(models.CashAdvancedVendor, {foreignKey: 'vendorId', as:'vendor'});

  };
  return CheckRequest;
};