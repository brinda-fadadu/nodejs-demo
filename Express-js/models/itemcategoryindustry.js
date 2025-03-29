'use strict';
module.exports = (sequelize, DataTypes) => {
  const ItemCategoryIndustry = sequelize.define('ItemCategoryIndustry', {
    itemCategoryId: DataTypes.INTEGER,
    itemIndustryId: DataTypes.INTEGER
  }, {
    tableName: 'ItemCategoryIndustry'
  });
  ItemCategoryIndustry.associate = function(models) {
    // associations can be defined here
    ItemCategoryIndustry.belongsTo(models.ItemCategory, { foreignKey: 'itemCategoryId' })  
    ItemCategoryIndustry.belongsTo(models.ItemIndustry, { foreignKey: 'itemIndustryId' })  
  };
  return ItemCategoryIndustry;
};