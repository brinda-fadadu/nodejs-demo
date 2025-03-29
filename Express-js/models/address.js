'use strict';
module.exports = (sequelize, DataTypes) => {
  const Address = sequelize.define('Address', {
    apartment: DataTypes.STRING,
    line1: DataTypes.STRING,
    line2: DataTypes.STRING,
    state: DataTypes.STRING,
    city: DataTypes.STRING,
    county: DataTypes.STRING,
    country: DataTypes.STRING,
    zipcode: DataTypes.STRING
  }, {
    tableName: 'Address',
    timestamps: true
  });
  Address.associate = function(models) {
    // associations can be defined here
    Address.hasOne(models.Place, {foreignKey: 'addressId'})
  };
  return Address;
};