'use strict';
module.exports = (sequelize, DataTypes) => {
  const PropertyType = sequelize.define('PropertyType', {
    name: DataTypes.STRING,
    code: DataTypes.STRING
  }, {
    tableName: 'PropertyType',
    timestamps: false
  });
  PropertyType.associate = function(models) {
    // associations can be defined here
    // PropertyType.hasMany(models.Property, { foreignKey: 'propertyTypeId', as: 'properties', sourceKey: 'id' })
    PropertyType.hasMany(models.IntermentRights, { foreignKey: 'propertyTypeId', sourceKey: 'id' })
  };
  return PropertyType;
};