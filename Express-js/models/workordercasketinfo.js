'use strict';
module.exports = (sequelize, DataTypes) => {
  const WorkOrderCasketInfo = sequelize.define('WorkOrderCasketInfo', {
    workOrderId: DataTypes.INTEGER,
    height: DataTypes.INTEGER,
    width: DataTypes.INTEGER,
    depth: DataTypes.INTEGER
  }, {
    tableName: 'WorkOrderCasketInfo',
    timestamps: false
  });
  WorkOrderCasketInfo.associate = function(models) {
    // associations can be defined here
  };
  return WorkOrderCasketInfo;
};