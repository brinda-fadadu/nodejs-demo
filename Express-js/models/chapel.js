'use strict';
module.exports = (sequelize, DataTypes) => {
  const Chapel = sequelize.define('Chapel', {
    name: DataTypes.STRING,
    locationId: DataTypes.INTEGER,
    placeId: DataTypes.INTEGER,
    isActive: DataTypes.BOOLEAN
  }, {
    tableName: 'Chapel',
    timestamps: false
  });
  Chapel.associate = function(models) {
    // associations can be defined here
    Chapel.hasMany(models.ChapelTypeChapel, { foreignKey: 'chapelId' })
    Chapel.belongsTo(models.Place, {foreignKey: 'placeId', as: 'place'})
    Chapel.belongsTo(models.Location, {foreignKey: 'locationId', as: 'location'})
  };
  return Chapel;
};