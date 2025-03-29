'use strict';
module.exports = (sequelize, DataTypes) => {
  const AgreementPackageItem = sequelize.define('AgreementPackageItem', {
    agreementPackageId: DataTypes.INTEGER,
    locationItemId: DataTypes.INTEGER,
    packageId: DataTypes.INTEGER
  }, {
    tableName: 'AgreementPackageItem',
    timestamps: false
  });
  AgreementPackageItem.associate = function(models) {
    // associations can be defined here
    AgreementPackageItem.belongsTo(models.LocationItem, { foreignKey: 'locationItemId',  as: 'locationItem' })
    AgreementPackageItem.belongsTo(models.AgreementPackage, { foreignKey: 'agreementPackageId',  as: 'agreementPackage' })
  };
  return AgreementPackageItem;
};