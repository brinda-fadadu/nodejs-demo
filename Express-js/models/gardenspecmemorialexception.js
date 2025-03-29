'use strict';
module.exports = (sequelize, DataTypes) => {
  const GardenSpecMemorialException = sequelize.define('GardenSpecMemorialException', {
    propertyId: DataTypes.INTEGER,
    memorialTypeAttributeValueId: DataTypes.INTEGER,
    memorialSizeAttributeValueId: DataTypes.INTEGER,
    otherAttributeValueIds: DataTypes.STRING,
    isSideBySideRule: DataTypes.BOOLEAN
  }, {
    timestamps: false,
    tableName: 'GardenSpecMemorialException'
  });
  GardenSpecMemorialException.associate = function(models) {
    // associations can be defined here
  };
  return GardenSpecMemorialException;
};