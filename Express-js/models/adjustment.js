'use strict';
module.exports = (sequelize, DataTypes) => {
  const Adjustment = sequelize.define('Adjustment', {
    title: DataTypes.STRING,
    adjustmentTypeId: DataTypes.INTEGER,
    agreementTypeId: DataTypes.INTEGER,
    code: DataTypes.STRING,
    description: DataTypes.STRING,
    discountUnit: DataTypes.STRING,
    maxDiscountValue: DataTypes.DOUBLE,
    discountValue: DataTypes.DOUBLE,
    startDate: DataTypes.DATE,
    endDate: DataTypes.DATE,
    isApprovalNeeded: DataTypes.BOOLEAN,
    isCustomAmount: DataTypes.BOOLEAN,
    isOnlyDiscount: DataTypes.BOOLEAN,
    hMISAdjustmentCode: DataTypes.STRING,
    isDisabled: DataTypes.BOOLEAN,
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER,
    deletedBy: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE
  },
  {
    tableName: 'Adjustment',
    timestamps: true
  });
  Adjustment.associate = function(models) {
    Adjustment.belongsTo(models.AdjustmentType, {foreignKey: 'adjustmentTypeId', as: 'adjustmentType'})
    Adjustment.hasMany(models.AdjustmentApproval, {foreignKey: 'adjustmentId', as: 'adjustmentApprovalRules'})
    Adjustment.hasMany(models.AdjustmentAgreementSection, {foreignKey: 'adjustmentId', as: 'adjustmentAgreementSection', sourceKey: 'id'})
    Adjustment.hasOne(models.AgreementAdjustment, {foreignKey: 'adjustmentId'})
    Adjustment.belongsTo(models.AgreementType, {foreignKey: 'agreementTypeId'})
    Adjustment.belongsTo(models.User, { foreignKey: 'createdBy' })
    Adjustment.belongsTo(models.User, { foreignKey: 'updatedBy' })
    Adjustment.belongsTo(models.User, { foreignKey: 'deletedBy' })
  };
  return Adjustment;
};