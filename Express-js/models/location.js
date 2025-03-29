'use strict';
module.exports = (sequelize, DataTypes) => {
  const Location = sequelize.define('Location', {
    name: DataTypes.STRING,
    code: DataTypes.STRING,
    addressId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Place',
        key: 'id'
      }
    },
    campus: {
      type: DataTypes.STRING
    },
    phoneNumber: {
      type: DataTypes.STRING
    },
    tax: DataTypes.DECIMAL(10, 2),
    license: DataTypes.STRING,
    fax: DataTypes.STRING,
    locationType: DataTypes.STRING
  }, {
    tableName: 'Location',
    timestamps: false
  });
  Location.associate = function(models) {
    // associations can be defined here
    Location.belongsTo(models.Place, {foreignKey: 'addressId', as: 'place'})
    Location.hasMany(models.Call, { foreignKey: 'receivedLocationId', as: 'AsLocationToCall' })
    Location.hasMany(models.Employee, { foreignKey: 'locationId' })
  };
  return Location;
};
