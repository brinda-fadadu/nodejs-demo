'use strict';
module.exports = (sequelize, DataTypes) => {
  const ItemCategory = sequelize.define('ItemCategory', {
    name: DataTypes.STRING,
    itemTypeId: DataTypes.INTEGER,
    code: DataTypes.STRING
  }, {
    tableName: 'ItemCategory'
  });

  ItemCategory.associate = function(models) {
    // associations can be defined here
    ItemCategory.belongsTo(models.ItemType, { foreignKey: 'itemTypeId' })    
    ItemCategory.hasMany(models.ItemCategoryIndustry, { foreignKey: 'itemCategoryId', as: 'itemCategoryIndustry'})
    ItemCategory.hasMany(models.MemorialSpec, { foreignKey: 'itemCategoryId', sourceKey: 'id'})
    ItemCategory.hasMany(models.MemorialAddOnSpec, { foreignKey: 'addOnItemCategoryId', sourceKey: 'id'})
  };
  return ItemCategory;
};