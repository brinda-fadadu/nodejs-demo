'use strict';
module.exports = (sequelize, DataTypes) => {
  const IntermentRights = sequelize.define('IntermentRights', {
    propertyTypeId: DataTypes.INTEGER,
    propertyCampusId: DataTypes.INTEGER,
    graves: DataTypes.INTEGER,
    rights: DataTypes.INTEGER,
    maxRights: DataTypes.INTEGER
  }, {
    timestamps: false,
    tableName: 'IntermentRights'
  });
  IntermentRights.associate = function(models) {
    // associations can be defined here
    IntermentRights.belongsTo(models.PropertyType, {foreignKey: 'propertyTypeId', targetKey: 'id'})
    IntermentRights.belongsTo(models.PropertyCampus, {foreignKey: 'propertyCampusId', targetKey: 'id'})
    IntermentRights.hasMany(models.GardenSpec, {foreignKey: 'intermentRightsId', sourceKey: 'id'})
    IntermentRights.hasMany(models.GardenSpecMemorial, {foreignKey: 'intermentRightsId', sourceKey: 'id'})
  };
  return IntermentRights;
};