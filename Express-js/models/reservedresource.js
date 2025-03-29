'use strict';
module.exports = (sequelize, DataTypes) => {
  const ReservedResource = sequelize.define('ReservedResource', {
    resourceType: DataTypes.STRING,
    resourceId: DataTypes.INTEGER,
    reservationDate: DataTypes.DATE,
    startTime: DataTypes.DATE,
    endTime: DataTypes.DATE,
    blockStartTime: DataTypes.DATE,
    blockEndTime: DataTypes.DATE
  }, {
    tableName: 'ReservedResource',
    timestamps: true
  });
  ReservedResource.associate = function (models) {
    ReservedResource.belongsTo(models.Chapel, { foreignKey: 'resourceId', targetKey: 'id', as: 'reservedChapelDetails' })
    ReservedResource.belongsTo(models.Vehicles, { foreignKey: 'resourceId',targetKey: 'id', as: 'reservedVehicleDetails' })
    ReservedResource.belongsTo(models.WorkOrderTask, { foreignKey: 'resourceId', targetKey: 'resourceReservationId', as: 'reservedWorkOrderTask' })
  };
  return ReservedResource;
};