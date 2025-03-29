'use strict';
module.exports = (sequelize, DataTypes) => {
  const WorkOrderChamberAccountabilityLog = sequelize.define('WorkOrderChamberAccountabilityLog', {
    workOrderId: DataTypes.INTEGER,
    type: DataTypes.STRING,
    logDate: DataTypes.DATE,
    weight: DataTypes.DECIMAL(10, 2),
    operator: DataTypes.INTEGER,
    chamberNumber: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
    deletedBy: DataTypes.INTEGER,
    createdBy: DataTypes.INTEGER,
    replacedBy: DataTypes.INTEGER,
    clFacilityLocationId: DataTypes.INTEGER,
    serviceLocationId: DataTypes.INTEGER,
    urnSelection: DataTypes.STRING,
    urnDeliveryDate: DataTypes.DATE
  }, {
    tableName: 'WorkOrderChamberAccountabilityLog',
    timestamps: true
  });
  WorkOrderChamberAccountabilityLog.associate = function(models) {
    // associations can be defined here
    WorkOrderChamberAccountabilityLog.belongsTo(models.WorkOrder, {foreignKey: 'workOrderId', as: 'workOrder'})
    WorkOrderChamberAccountabilityLog.belongsTo(models.User, {foreignKey: 'operator', as: 'Operator'})
    WorkOrderChamberAccountabilityLog.belongsTo(models.CrematoryRetorts, {foreignKey: 'chamberNumber', as: 'chamber'})
    WorkOrderChamberAccountabilityLog.belongsTo(models.Location, {foreignKey: 'clFacilityLocationId', as: 'clFacilityLocation'})
    WorkOrderChamberAccountabilityLog.belongsTo(models.Place, {foreignKey: 'serviceLocationId', as: 'serviceLocation'})
  };
  return WorkOrderChamberAccountabilityLog;
};