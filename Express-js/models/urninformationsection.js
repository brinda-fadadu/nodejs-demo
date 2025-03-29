'use strict';
module.exports = (sequelize, DataTypes) => {
  const UrnInformationSection = sequelize.define('UrnInformationSection', {
    urnId: DataTypes.INTEGER,
    isFamilyOwnedUrn: DataTypes.BOOLEAN,
    height: DataTypes.STRING,
    width: DataTypes.STRING,
    depth: DataTypes.STRING,
    urnType: DataTypes.INTEGER,
    urnStatus: DataTypes.STRING,
    receivedDate: DataTypes.DATE,
    isTransferRequired: DataTypes.BOOLEAN,
    resourceType: DataTypes.STRING,
    scheduledFuneralServiceId: DataTypes.INTEGER,
    scheduledCemeteryServiceId: DataTypes.INTEGER
  }, {
    tableName: 'UrnInformationSection',
    timestamps: false
  });
  UrnInformationSection.associate = function(models) {
    // associations can be defined here
    UrnInformationSection.belongsTo(models.AttributeValue, { foreignKey: 'urnType', as: 'urnTypeDetails'})
    UrnInformationSection.belongsTo(models.AgreementLocationItem, { foreignKey: 'urnId', as: 'urn' })
    UrnInformationSection.belongsTo(models.ItemUsage, { foreignKey: 'urnId' })
  };
  return UrnInformationSection;
};