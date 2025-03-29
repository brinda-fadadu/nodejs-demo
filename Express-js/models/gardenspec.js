'use strict';
module.exports = (sequelize, DataTypes) => {
  const GardenSpec = sequelize.define('GardenSpec', {
    intermentRightsId: DataTypes.INTEGER,
    itemTypeId: DataTypes.INTEGER,
    itemCategoryAttributeValueId: DataTypes.INTEGER
  }, {
    timestamps: false,
    tableName: 'GardenSpec'
  });
  GardenSpec.associate = function(models) {
    // associations can be defined here
    GardenSpec.belongsTo(models.IntermentRights, {foreignKey: 'intermentRightsId', targetKey: 'id'})
    GardenSpec.belongsTo(models.ItemType, {foreignKey: 'itemTypeId', targetKey: 'id'})
    GardenSpec.belongsTo(models.ItemCategoryAttributeValue, {foreignKey: 'itemCategoryAttributeValueId', targetKey: 'id'})
  };
  return GardenSpec;
};