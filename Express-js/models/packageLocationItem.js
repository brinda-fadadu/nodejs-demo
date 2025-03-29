'use strict';
const Op = require('sequelize').Op
module.exports = (sequelize, DataTypes) => {
  const PackageLocationItem = sequelize.define('PackageLocationItem', {
    packageId: DataTypes.INTEGER,
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    locationItemId: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, {
      defaultScope: {
        where: {
          isActive: true
        }
      },
      tableName: 'PackageLocationItem',
    });

  PackageLocationItem.associate = function (models) {
    // associations can be defined here
    PackageLocationItem.belongsTo(models.Package, { foreignKey: 'packageId' })
    PackageLocationItem.belongsTo(models.LocationItem, { foreignKey: 'locationItemId', as: 'locationItem' })
  };
  return PackageLocationItem;
};