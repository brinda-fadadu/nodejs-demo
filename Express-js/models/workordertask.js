'use strict';
module.exports = (sequelize, DataTypes) => {
  const WorkOrderTask = sequelize.define('WorkOrderTask', {
    name: DataTypes.STRING,
    resourceReservationId: DataTypes.INTEGER
  }, {
    tableName: 'WorkOrderTask',
    timestamps: false
  });
  WorkOrderTask.associate = function(models) {
    // associations can be defined here
    WorkOrderTask.belongsTo(models.ReservedResource, {foreignKey: 'resourceReservationId', as: 'reservedResource'})
    WorkOrderTask.belongsTo(models.EmployeeSchedule, {foreignKey: 'resourceReservationId', as: 'reservedEmployeeSchedule'})

  };
  return WorkOrderTask;
};