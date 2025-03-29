'use strict';
module.exports = (sequelize, DataTypes) => {
  const MaintenanceRequest = sequelize.define('MaintenanceRequest', {
    graveMarkerLocation:{
      type: DataTypes.STRING
    },
    serviceLocation:{
      type: DataTypes.STRING
    },
    callId: {
      type: DataTypes.INTEGER
    }
  }, {
    tableName: 'MaintenanceRequest',
    timestamps: true
  });
  MaintenanceRequest.associate = function(models) {
    // associations can be defined here
    MaintenanceRequest.hasMany(models.MaintenanceRequestCause, { foreignKey: 'maintenanceRequestId', as: 'maintenanceRequestReasonType' })
    MaintenanceRequest.belongsTo(models.Call,{
      foreignKey:'callId'
    });
  };
  return MaintenanceRequest;
};