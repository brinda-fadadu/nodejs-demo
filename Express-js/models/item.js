'use strict';
module.exports = (sequelize, DataTypes) => {
  const Item = sequelize.define('Item', {
    code: DataTypes.STRING,
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    cost: DataTypes.DECIMAL(10, 2),
    isTaxable: DataTypes.BOOLEAN,
    isActive: DataTypes.BOOLEAN,
    itemStatusId: DataTypes.INTEGER,
    itemCategoryId: DataTypes.INTEGER,
    vendorId: DataTypes.INTEGER
  }, {
    tableName: 'Item',
    timestamps:true
  });
  Item.associate = function(models) {
    Item.hasMany(models.LocationItem, {foreignKey: 'itemId', as: 'ItemPrices'})
    Item.hasMany(models.ItemAttributeValue, {foreignKey: 'itemId', as: 'itemAttributes'})
    Item.belongsTo(models.Vendor, {foreignKey: 'vendorId'})
    Item.belongsTo(models.ItemCategory, {foreignKey: 'itemCategoryId'})
    Item.hasMany(models.ItemImages, { foreignKey: 'resourceId', constraints: false, scope: {
      resourceType: 'Item'
    }})
  };
  return Item;
};