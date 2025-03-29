'use strict';
module.exports = (sequelize, DataTypes) => {
  const OrganizationType = sequelize.define('OrganizationType', {
    type: DataTypes.STRING
  }, {
    tableName:'OrganizationType',
    timestamps: false
  });
  OrganizationType.associate = function(models) {
    // associations can be defined here
    OrganizationType.hasMany(models.Organization, {foreignKey:'organizationTypeId',sourceKey:'id'});
  };
  return OrganizationType;
};