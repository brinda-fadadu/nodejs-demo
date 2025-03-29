'use strict';
module.exports = (sequelize, DataTypes) => {
  const MerchandiseAdditionalInfoSection = sequelize.define('MerchandiseAdditionalInfoSection', {
    isVasesSelected: DataTypes.BOOLEAN,
    noOfVases: DataTypes.INTEGER,
    instruction: DataTypes.TEXT
  }, {
    tableName: 'MerchandiseAdditionalInfoSection',
    timestamps: false
  });
  MerchandiseAdditionalInfoSection.associate = function(models) {
    // associations can be defined here
  };
  return MerchandiseAdditionalInfoSection;
};