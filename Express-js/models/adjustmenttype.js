'use strict';
module.exports = (sequelize, DataTypes) => {
  const AdjustmentType = sequelize.define('AdjustmentType', {
    adjustmentType: DataTypes.STRING
  }, {
    tableName: 'AdjustmentType',
    timestamps: false
  });
  AdjustmentType.associate = function(models) {
  };
  return AdjustmentType;
};