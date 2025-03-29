'use strict';
module.exports = (sequelize, DataTypes) => {
  const ItemStatus = sequelize.define('ItemStatus', {
    status: DataTypes.STRING
  }, {});
  ItemStatus.associate = function(models) {
    // associations can be defined here
  };
  return ItemStatus;
};