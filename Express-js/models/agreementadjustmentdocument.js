'use strict';
module.exports = (sequelize, DataTypes) => {
  const AgreementAdjustmentDocument = sequelize.define('AgreementAdjustmentDocument', {
    statementAdjustmentId: DataTypes.INTEGER,
    fileUrl: DataTypes.STRING
  },
  {
    tableName: 'AgreementAdjustmentDocument',
    timestamps: false
  });
  AgreementAdjustmentDocument.associate = function(models) {
    // associations can be defined here
  };
  return AgreementAdjustmentDocument;
};