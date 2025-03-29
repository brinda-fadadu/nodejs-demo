'use strict';
module.exports = (sequelize, DataTypes) => {
  const SideBySideProperty = sequelize.define('SideBySideProperty', {
    agreementId: DataTypes.INTEGER,
    leftAgreementPropertyId: DataTypes.INTEGER,
    rightAgreementPropertyId: DataTypes.INTEGER,
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER,
    deletedBy: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE
  }, {
    tableName: 'SideBySideProperty'
  });
  SideBySideProperty.associate = function(models) {
    // associations can be defined here
  };
  return SideBySideProperty;
};