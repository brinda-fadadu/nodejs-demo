'use strict';
module.exports = (sequelize, DataTypes) => {
  const ChapelTypeChapel = sequelize.define('ChapelTypeChapel', {
    chapelId: DataTypes.INTEGER,
    chapelTypeId: DataTypes.INTEGER
  }, {
    tableName: 'ChapelTypeChapel',
    timestamps: false
  });
  ChapelTypeChapel.associate = function(models) {
    // associations can be defined here
    ChapelTypeChapel.belongsTo(models.Chapel, {foreignKey: 'chapelId'})
    ChapelTypeChapel.belongsTo(models.ChapelType, { foreignKey: 'chapelTypeId'})
  };
  return ChapelTypeChapel;
};