'use strict';
module.exports = (sequelize, DataTypes) => {
  const SubService = sequelize.define('SubService', {
    name: DataTypes.STRING
  }, {
    tableName: 'SubService',
    timestamps: false
  });
  SubService.associate = function(models) {
    // associations can be defined here
    SubService.hasMany(models.SubServiceSection, { foreignKey: 'subServiceId'})
  };
  return SubService;
};