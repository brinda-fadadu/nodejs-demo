'use strict';
module.exports = (sequelize, DataTypes) => {
  const Vendor = sequelize.define('Vendor', {
    code: DataTypes.STRING,
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    addressId: DataTypes.INTEGER
  }, {
    tableName: 'Vendor',
    timestamps: false
  });
  Vendor.associate = function(models) {
    // associations can be defined here    
  };
  return Vendor;
};