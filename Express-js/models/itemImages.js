'use strict'
module.exports = (sequelize, DataTypes) => {
  const ItemImages = sequelize.define(
    'ItemImages',
    {
      resourceType: DataTypes.STRING, // Item, Package
      resourceId: DataTypes.INTEGER,
      imageUrl: DataTypes.STRING,
      isPrimary: DataTypes.BOOLEAN,
      deletedAt: DataTypes.DATE,
      deletedBy: DataTypes.INTEGER,
      createdBy: DataTypes.INTEGER,
      updatedBy: DataTypes.INTEGER
    },
    {
      tableName: 'ItemImages',
      timestamps: true
    }
  )
  ItemImages.associate = function(models) {
    // associations can be defined here

    // this hook is used to
    // 1. properly support eager loading,
    // 2.define an afterFind hook on the Comment model that automatically populates the commentable field in every instance;
    ItemImages.addHook('afterFind', foundResult => {
      if (foundResult) {
        if (!Array.isArray(foundResult)) foundResult = [foundResult]
        for (const instance of foundResult) {
          if (
            instance.resourceType === 'Item' &&
            instance.item !== undefined
          ) {
            delete instance.package
            delete instance.dataValues.package
          } else if (
            instance.resourceType === 'Package' &&
            instance.package !== undefined
          ) {
            delete instance.item
            delete instance.dataValues.item
          }
        }
      }
      return foundResult
    })

    ItemImages.belongsTo(models.Item, {
      foreignKey: 'resourceId',
      constraints: false,
      as: 'item'
    })

    ItemImages.belongsTo(models.Package, {
      foreignKey: 'resourceId',
      constraints: false,
      as: 'package'
    })
  }
  return ItemImages
}
