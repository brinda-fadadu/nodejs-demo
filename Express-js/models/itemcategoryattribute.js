'use strict';
module.exports = (sequelize, DataTypes) => {
  const ItemCategoryAttribute = sequelize.define('ItemCategoryAttribute', {
    itemCategoryId: DataTypes.INTEGER,
    attributeId: DataTypes.INTEGER
  }, {});
  ItemCategoryAttribute.associate = function(models) {
    // associations can be defined here
  };
  return ItemCategoryAttribute;
};