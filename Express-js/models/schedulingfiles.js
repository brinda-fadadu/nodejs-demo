'use strict';
module.exports = (sequelize, DataTypes) => {
  const SchedulingFile = sequelize.define('SchedulingFile', {
    schedulingType: DataTypes.STRING, // funeral or cemetery
    fileUrl: DataTypes.STRING,  // uploaded file url
    schedulingId: DataTypes.INTEGER // scheduledCemeteryserviceId or scheduledFuneralServiceId
  }, {
    "timestamps": false,
    tableName: 'SchedulingFile'
  });
  SchedulingFile.associate = function(models) {
    // associations can be defined here
    SchedulingFile.belongsTo(models.ScheduledFuneralService, { foreignKey: 'schedulingId' })
    SchedulingFile.belongsTo(models.ScheduledCemeteryService, { foreignKey: 'schedulingId' })
    SchedulingFile.hasOne(models.File, {
      sourcekey: 'id',
      foreignKey: 'resourceId',
      as: 'schedulingFileUrl'
    })
  };
  return SchedulingFile;
};