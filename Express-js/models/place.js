'use strict';
const esOrganization = require('../es_models/organization');
module.exports = (sequelize, DataTypes) => {
  const Place = sequelize.define('Place', {
    organizationId: DataTypes.INTEGER,
    addressTypeId: DataTypes.INTEGER,
    addressId: DataTypes.INTEGER,
    createdAt:{
      type: DataTypes.DATE,
      defaultValue: Date.now()
    },
    updatedAt:{
      type: DataTypes.DATE,
      defaultValue: Date.now()
    },
  }, {
    tableName: 'Place'
  });
  Place.associate = function(models) {
    // associations can be defined here
    Place.belongsTo(models.Address, { foreignKey: 'addressId', as: 'address'})
    Place.belongsTo(models.AddressTypes, { foreignKey: 'addressTypeId', as: 'addressType'})
    Place.belongsTo(models.Organization, { foreignKey: 'organizationId', as: 'organization'})
  };

  Place.afterDestroy(esOrganization.delete);

  return Place;
};