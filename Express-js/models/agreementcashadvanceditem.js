'use strict';
module.exports = (sequelize, DataTypes) => {
  const AgreementCashAdvancedItem = sequelize.define('AgreementCashAdvancedItem', {
    locationItemId: DataTypes.INTEGER,
    agreementId: DataTypes.INTEGER,
    agreementItemPriceId: DataTypes.INTEGER,
    note: DataTypes.STRING,
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER,
    deletedBy: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
    addendumId: DataTypes.INTEGER,
    formId: DataTypes.INTEGER
  }, {
    tableName: 'AgreementCashAdvancedItem',
    timestamps: true
  });
  AgreementCashAdvancedItem.associate = function (models) {
    AgreementCashAdvancedItem.belongsTo(models.AgreementItemPrice, { foreignKey: 'agreementItemPriceId', as: 'agreementItemPrice' })
    AgreementCashAdvancedItem.belongsTo(models.LocationItem, { foreignKey: 'locationItemId', as: 'locationItem' })
    AgreementCashAdvancedItem.belongsTo(models.Agreement, { foreignKey: 'agreementId', as: 'agreementDetails' })
    AgreementCashAdvancedItem.belongsTo(models.Addendum, { foreignKey: 'addendumId', as: 'addendumDetails' })
    AgreementCashAdvancedItem.belongsTo(models.CaseInfoForm, { foreignKey: 'formId', as: 'chequeRequestForm' })

  };
  return AgreementCashAdvancedItem;
};