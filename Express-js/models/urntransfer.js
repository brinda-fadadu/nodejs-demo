'use strict';
module.exports = (sequelize, DataTypes) => {
  const UrnTransfer = sequelize.define('UrnTransfer', {
    agreementId: DataTypes.INTEGER,
    addendumId: DataTypes.INTEGER,
    status: DataTypes.INTEGER,
    resourceType: DataTypes.STRING,
    resourceId: DataTypes.INTEGER,
    contractNumber: DataTypes.STRING,
    addendumNumber: DataTypes.STRING,
    serviceDate: DataTypes.DATE,
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
    deletedBy: DataTypes.INTEGER
  }, {
    timestamps: true,
    tableName: 'UrnTransfer'
  });
  UrnTransfer.associate = function(models) {
    // associations can be defined here
    UrnTransfer.belongsTo(models.ScheduledFuneralService, {foreignKey: 'resourceId', as: 'urnTransferScheduledFuneralService'})
    UrnTransfer.belongsTo(models.ScheduledCemeteryService, {foreignKey: 'resourceId', as: 'urnTransferScheduledCemeteryService'})
  };
  return UrnTransfer;
};