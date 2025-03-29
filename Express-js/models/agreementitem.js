'use strict';
module.exports = (sequelize, DataTypes) => {
  const AgreementItem = sequelize.define('AgreementItem', {
    resourceId: DataTypes.INTEGER,
    agreementId: DataTypes.INTEGER,
    resourceType: DataTypes.STRING,
    quantity: DataTypes.INTEGER,
    tax: DataTypes.DECIMAL(10, 2),
    price: DataTypes.DECIMAL(10, 2),
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER,
    parentId: DataTypes.INTEGER,
    reservationStatus:DataTypes.STRING,
    deletedAt: DataTypes.DATE,
    deletedBy: DataTypes.INTEGER
  }, {
    tableName: 'AgreementItem'
  });
  AgreementItem.associate = function(models) {
    // associations can be defined here
    AgreementItem.belongsTo(models.Package, {
      foreignKey: 'resourceId',
      constraints: false,
      as: 'package'
    })
    AgreementItem.belongsTo(models.LocationItem, {
      foreignKey: 'resourceId',
      constraints: false,
      as: 'locationItem'
    })
    AgreementItem.belongsTo(models.Property, {
      foreignKey: 'resourceId',
      constraints: false,
      as: 'property'
    })
  };
  return AgreementItem;
};