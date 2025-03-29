'use strict';
module.exports = (sequelize, DataTypes) => {
  const ApprovalRoles = sequelize.define('ApprovalRoles', {
    approvalId: DataTypes.INTEGER,
    roleId: DataTypes.INTEGER,
    order: DataTypes.INTEGER,
    requested: DataTypes.BOOLEAN
  }, {
    tableName: 'ApprovalRoles',
    timestamps: false
  });
  ApprovalRoles.associate = function(models) {
    // associations can be defined here
  };
  return ApprovalRoles;
};