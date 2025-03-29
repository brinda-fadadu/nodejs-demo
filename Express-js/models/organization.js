'use strict';
module.exports = (sequelize, DataTypes) => {
  const Organization = sequelize.define('Organization', {
    organizationTypeId: DataTypes.INTEGER,
    name: DataTypes.STRING,
    phoneNumber: DataTypes.STRING,
    licenseNumber: DataTypes.STRING,
    createdAt:{
      type: DataTypes.DATE,
      defaultValue: Date.now()
    },
    updatedAt:{
      type: DataTypes.DATE,
      defaultValue: Date.now()
    },
    hmisNameId: {
      type: DataTypes.INTEGER
    },
    deletedAt: DataTypes.DATE,
    deletedBy: DataTypes.INTEGER,
    createdBy: DataTypes.INTEGER
  }, {
    tableName: 'Organization',
    timestamps: true
  });
  Organization.associate = function(models) {
    // associations can be defined here
    Organization.hasOne(models.Place, { foreignKey: 'organizationId' })
    Organization.belongsTo(models.OrganizationType, { foreignKey: 'organizationTypeId', as: 'organizationType'})

    Organization.addScope('defaultScope', {
      include: [
        {
          model: models.OrganizationType,
          as: 'organizationType'
        }
      ]
    })
  };
  return Organization;
};