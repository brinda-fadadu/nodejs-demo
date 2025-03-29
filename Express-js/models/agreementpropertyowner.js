'use strict';
module.exports = (sequelize, DataTypes) => {
  const AgreementPropertyOwner = sequelize.define('AgreementPropertyOwner', {
    agreementPropertyId: DataTypes.INTEGER,
    ownerId: DataTypes.INTEGER,
    deletedInAddendumId: DataTypes.INTEGER,
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
    deletedBy: DataTypes.INTEGER,
    addedInAddendumId: DataTypes.INTEGER
  }, {
    tableName: 'AgreementPropertyOwner',
    timestamps: true
  });
  AgreementPropertyOwner.associate = function(models) {
    // associations can be defined here
    AgreementPropertyOwner.belongsTo(models.Person, {foreignKey:'ownerId', as: 'person'})
  };
  return AgreementPropertyOwner;
};