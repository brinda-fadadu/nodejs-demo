'use strict';
module.exports = (sequelize, DataTypes) => {
  const HMISDataSyncStatus = sequelize.define('HMISDataSyncStatus', {
    name: DataTypes.STRING
  }, {
    tableName: 'HMISDataSyncStatus',
    timestamps: false
  });
  HMISDataSyncStatus.associate = function(models) {
    // associations can be defined here
  };
  return HMISDataSyncStatus;
};