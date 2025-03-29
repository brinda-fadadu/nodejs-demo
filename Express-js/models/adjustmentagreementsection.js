'use strict';
module.exports = (sequelize, DataTypes) => {
  const AdjustmentAgreementSection = sequelize.define('AdjustmentAgreementSection', {
    adjustmentId: DataTypes.INTEGER,
    agreementSectionId: DataTypes.INTEGER
  },
  {
    tableName: 'AdjustmentAgreementSection',
    timestamps: false
  });
  AdjustmentAgreementSection.associate = function(models) {
    AdjustmentAgreementSection.belongsTo(models.AgreementSection, {foreignKey: 'agreementSectionId', as:'agreementSection'})
    AdjustmentAgreementSection.belongsTo(models.Adjustment, {foreignKey: 'adjustmentId'})
  };
  return AdjustmentAgreementSection;
};