'use strict';
module.exports = (sequelize, DataTypes) => {
  const OtherRequest = sequelize.define('OtherRequest', {
    isFollowUpRequired: DataTypes.BOOLEAN,
    email: DataTypes.STRING,
    callId: DataTypes.INTEGER
  }, {
    tableName: 'OtherRequest',
    timestamps: true
  });
  OtherRequest.associate = function(models) {
    // associations can be defined here
    // OtherRequest.hasMany(models.OtherRequestFollowUp, { foreignKey: 'otherRequestId' })
    OtherRequest.belongsTo(models.Call, { foreignKey: 'callId'})
    OtherRequest.hasMany(models.OtherRequestFollowUp, { foreignKey: 'otherRequestId', as:'otherRequestFollowUps'})
    // OtherRequest.belongsTo(models.User, { foreignKey: 'createdBy'})
    
  };
  return OtherRequest;
};