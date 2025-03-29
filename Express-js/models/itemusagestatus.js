'use strict';
module.exports = (sequelize, DataTypes) => {
  const ItemUsageStatus = sequelize.define('ItemUsageStatus', {
    status: DataTypes.STRING
  }, {
      tableName: 'ItemUsageStatus',
      timestamps: false
  });
  ItemUsageStatus.associate = function(models) {
    // associations can be defined here
  };
  return ItemUsageStatus;
};