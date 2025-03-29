'use strict';
module.exports = (sequelize, DataTypes) => {
  const PackageCategory = sequelize.define('PackageCategory', {
    name: DataTypes.STRING,
    code: DataTypes.STRING,
  }, {
      tableName: 'PackageCategory',
    });
  PackageCategory.associate = function (models) {
    // associations can be defined here
    PackageCategory.hasMany(models.Package, { foreignKey: 'packageCategoryId' })
  };
  return PackageCategory;
};