'use strict';
module.exports = (sequelize, DataTypes) => {
  const StaffType = sequelize.define('StaffType', {
    name: DataTypes.STRING
  }, {
    tableName: 'StaffType',
    timestamps: false
  });
  StaffType.associate = function(models) {
    // associations can be defined here
  };
  return StaffType;
};