'use strict';
module.exports = (sequelize, DataTypes) => {
  const CallAssignment = sequelize.define('CallAssignment', {
    callId: DataTypes.INTEGER,
    assignedToId: DataTypes.INTEGER
  }, {
    tableName: 'CallAssignment',
    timestamps: false
  });
  CallAssignment.associate = function(models) {
    // associations can be defined here
    CallAssignment.belongsTo(models.Call, { foreignKey: 'callId', as: 'callAssignment'})
    CallAssignment.belongsTo(models.Employee, {foreignKey: 'assignedToId', as: 'assignedTo'})
  };
  return CallAssignment;
};