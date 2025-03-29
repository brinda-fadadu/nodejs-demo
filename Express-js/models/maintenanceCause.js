'use strict';
module.exports = (sequelize, DataTypes) => {
  const MaintenanceCause = sequelize.define('MaintenanceCause', {    
    name: DataTypes.STRING
  }, 
  {
    tableName: 'MaintenanceCause',
    timestamps: false
  });
  MaintenanceCause.associate = function(models) {
    // associations can be defined here
    MaintenanceCause.hasMany(models.MaintenanceRequestCause, { foreignKey: 'maintenanceCauseId' })
  };
  return MaintenanceCause;
};