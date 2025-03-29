'use strict';
module.exports = (sequelize, DataTypes) => {
  const HMISAddendumDataSync = sequelize.define('HMISAddendumDataSync', {
    addendumId: DataTypes.INTEGER,
    hmisDataSyncId: DataTypes.INTEGER,
    statusId: DataTypes.INTEGER,
    warningsAcknowledged: DataTypes.BOOLEAN,
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    failureReason: DataTypes.STRING
  }, {
    tableName: 'HMISAddendumDataSync',
    timestamps: true
  });
  HMISAddendumDataSync.associate = function(models) {
    // associations can be defined here
    HMISAddendumDataSync.belongsTo(models.HMISDataSyncStatus, {
      foreignKey: 'statusId',
      as: 'HMISDataSyncStatus'
    })
  };
  return HMISAddendumDataSync;
};