'use strict';
module.exports = (sequelize, DataTypes) => {
  const MemorialSpec = sequelize.define('MemorialSpec', {
    memorialTypeAttributeValueId: DataTypes.INTEGER,
    memorialSizeAttributeValueId: DataTypes.INTEGER,
    itemCategoryId: DataTypes.INTEGER,
    attributeValueIds: DataTypes.STRING
  }, {
    timestamps: false,
    tableName: 'MemorialSpec'
  });
  MemorialSpec.associate = function(models) {
    // associations can be defined here
    MemorialSpec.belongsTo(models.ItemCategory, {foreignKey: 'itemCategoryId', targetKey: 'id'})
    MemorialSpec.belongsTo(models.AttributeValue, {foreignKey: 'memorialTypeAttributeValueId', targetKey: 'id'})
    MemorialSpec.belongsTo(models.AttributeValue, {foreignKey: 'memorialSizeAttributeValueId', targetKey: 'id'})
  };
  return MemorialSpec;
};