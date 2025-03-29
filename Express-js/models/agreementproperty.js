'use strict';
module.exports = (sequelize, DataTypes) => {
  const AgreementProperty = sequelize.define('AgreementProperty', {
    agreementId: DataTypes.INTEGER,
    propertyId: DataTypes.INTEGER,
    agreementItemPriceId: DataTypes.INTEGER,
    reservationStatus: DataTypes.STRING,
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
    deletedBy: DataTypes.INTEGER,
    addendumId: DataTypes.INTEGER,
    reservationType: DataTypes.STRING,
    reservedDate: DataTypes.DATE,
    expiryDate: DataTypes.DATE
  }, {
    tableName: 'AgreementProperty',
    timestamps: true
  });
  AgreementProperty.associate = function(models) {
    // associations can be defined here
    AgreementProperty.belongsTo(models.AgreementItemPrice, { foreignKey: 'agreementItemPriceId', as: 'agreementPropertyPriceDetails' })
    AgreementProperty.belongsTo(models.Property, {foreignKey:'propertyId', as: 'property'})
    AgreementProperty.belongsTo(models.Agreement, {foreignKey:'agreementId', as: 'agreement'})
    AgreementProperty.hasMany(models.AgreementPropertyOwner, {foreignKey:'agreementPropertyId', as: 'agreementPropertyOwner'})
    AgreementProperty.addScope('propertyScope', {
      include: [
        {
          model: models.Property,
          as: 'property',
          required: true,
          include: [
            {
              model: models.PropertyGarden,
              as: 'propertyGardens'
            },
            {
              model: models.PropertyTypeCode,
              as: 'propertyTypeCode',
              include: [{
                model: models.PropertyType,
                as: 'propertyType'
              }]
            }
          ]
        }
      ]
    })
  };
  return AgreementProperty;
};