'use strict';
module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define('Role', {
    type: DataTypes.STRING,
    name: DataTypes.STRING
  }, {
    tableName: 'Role'
  });
  Role.associate = function(models) {
    // associations can be defined here    
    //Role.hasOne(models.AgreementPerson, { foreignKey : 'personRoleId'});
  };
  return Role;
};