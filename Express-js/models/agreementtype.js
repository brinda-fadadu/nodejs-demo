'use strict';
module.exports = (sequelize, DataTypes) => {
  const AgreementType = sequelize.define('AgreementType', {
    agreementType: DataTypes.STRING
  }, {
    tableName: 'AgreementType',
    timestamps: false
  });
  AgreementType.associate = function(models) {
    // associations can be defined here
  };
  return AgreementType;
};