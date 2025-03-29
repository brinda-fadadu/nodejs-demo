'use strict';
module.exports = (sequelize, DataTypes) => {
  const MaritalStatus = sequelize.define('MaritalStatus', {
    name: DataTypes.STRING  
  }, {
    tableName: 'MaritalStatus',
    timestamps: false
  });
  return MaritalStatus;
};