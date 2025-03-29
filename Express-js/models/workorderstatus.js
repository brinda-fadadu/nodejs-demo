'use strict';
module.exports = (sequelize, DataTypes) => {
  const WorkOrderStatus = sequelize.define('WorkOrderStatus', {
    name: DataTypes.STRING
  }, {
    tableName: 'WorkOrderStatus',
    timestamps: false
  });
  WorkOrderStatus.associate = function(models) {
    // associations can be defined here
  };
  return WorkOrderStatus;
};