'use strict';
module.exports = (sequelize, DataTypes) => {
  const AttributeValue = sequelize.define('AttributeValue', {
    name: DataTypes.STRING,
    attributeId: DataTypes.INTEGER
  }, {
    timestamps: true,
    tableName: 'AttributeValue'
  });
  AttributeValue.associate = function(models) {
    // associations can be defined here
  AttributeValue.hasMany(models.ItemCategoryAttributeValue, {foriegnKey: 'attributeValueId', as: 'AttributeCategoryValues'})
  AttributeValue.hasMany(models.SchedulingAttributeSection, {foriegnKey: 'attributeValueId', as: 'schedulingSections'})
  AttributeValue.belongsTo(models.Attribute, {foreignKey: 'attributeId', as: 'attribute'})
  AttributeValue.hasMany(models.MemorialSpec, {foriegnKey: 'memorialTypeAttributeValueId', sourceKey: 'id'})
  AttributeValue.hasMany(models.MemorialSpec, {foriegnKey: 'memorialSizeAttributeValueId', sourceKey: 'id'})
  AttributeValue.hasMany(models.MemorialAddOnSpec, {foriegnKey: 'memorialTypeAttributeValueId', sourceKey: 'id'})
  AttributeValue.hasMany(models.MemorialAddOnSpec, {foriegnKey: 'memorialSizeAttributeValueId', sourceKey: 'id'})
  AttributeValue.hasMany(models.MemorialAddOnSpec, {foriegnKey: 'addOnTypeAttributeValueId', sourceKey: 'id'})
  };
  return AttributeValue;
};