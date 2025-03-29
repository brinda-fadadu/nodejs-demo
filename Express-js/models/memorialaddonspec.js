'use strict';
module.exports = (sequelize, DataTypes) => {
  const MemorialAddOnSpec = sequelize.define('MemorialAddOnSpec', {
    memorialTypeAttributeValueId: DataTypes.INTEGER,
    memorialSizeAttributeValueId: DataTypes.INTEGER,
    addOnItemCategoryId: DataTypes.INTEGER,
    addOnTypeAttributeValueId: DataTypes.INTEGER,
    addOnAttributeValueIds: DataTypes.STRING
  }, {
    timestamps: false,
    tableName: 'MemorialAddOnSpec'});
  MemorialAddOnSpec.associate = function(models) {
    // associations can be defined here
    MemorialAddOnSpec.belongsTo(models.ItemCategory, {foreignKey: 'addOnItemCategoryId', targetKey: 'id'})
    MemorialAddOnSpec.belongsTo(models.AttributeValue, {foreignKey: 'memorialTypeAttributeValueId', targetKey: 'id'})
    MemorialAddOnSpec.belongsTo(models.AttributeValue, {foreignKey: 'memorialSizeAttributeValueId', targetKey: 'id'})
    MemorialAddOnSpec.belongsTo(models.AttributeValue, {foreignKey: 'addOnTypeAttributeValueId', targetKey: 'id'})
  };
  return MemorialAddOnSpec;
};