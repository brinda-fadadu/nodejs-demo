'use strict';
module.exports = (sequelize, DataTypes) => {
  const EmployeeSchedule = sequelize.define('EmployeeSchedule', {
    employeeId: DataTypes.INTEGER,
    startTime: DataTypes.DATE,
    createdAt: DataTypes.DATE,
    createdBy: DataTypes.INTEGER,
    updatedAt: DataTypes.DATE,
    updatedBy: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
    deletedBy: DataTypes.INTEGER,
    workOrderId: DataTypes.INTEGER,
    workOrderTaskId: DataTypes.JSON,
    endTime: DataTypes.DATE,
    staffType: DataTypes.STRING,
    replacedBy: DataTypes.INTEGER
}, {
    tableName: 'EmployeeSchedule',
    timestamps: true
  });
  EmployeeSchedule.associate = function(models) {
    // associations can be defined here
    EmployeeSchedule.belongsTo(models.WorkOrder, {foreignKey: 'workOrderId', as: 'workOrder'})
    EmployeeSchedule.belongsTo(models.WorkOrderTask, {foreignKey: 'workOrderTaskId', as: 'task'})
    EmployeeSchedule.belongsTo(models.Employee, {foreignKey: 'employeeId', as: 'employee'})

    EmployeeSchedule.addScope('notDeleted', {
      where: {
        deletedAt: null,
        deletedBy: null
      }
    })
  };
  return EmployeeSchedule;
};