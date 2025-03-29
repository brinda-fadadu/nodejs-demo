'use strict';
module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define('Permission', {
    userRoleId: DataTypes.INTEGER,
    moduleId: DataTypes.INTEGER,
    read: DataTypes.BOOLEAN,
    write: DataTypes.BOOLEAN,
    delete: DataTypes.BOOLEAN
  }, {
    tableName: 'Permission',
    timestamps: false
  });
  Permission.associate = function(models) {
    // associations can be defined here
    Permission.belongsTo(models.Module, {foreignKey: 'id', as: 'ModulePermissions'})
  };
  return Permission;
};