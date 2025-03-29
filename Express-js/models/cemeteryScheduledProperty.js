'use strict';
module.exports = (sequelize, DataTypes) => {
  const cemeteryScheduledProperty = sequelize.define('CemeteryScheduledProperty', {
    propertyId: DataTypes.INTEGER,
    intermentInfoSectionId: DataTypes.INTEGER,
    disintermentInfoSectionId: DataTypes.INTEGER,
  }, {
    tableName: 'CemeteryScheduledProperty',
    timestamps: false
  });
  cemeteryScheduledProperty.associate = function(models) {
    // associations can be defined here
    cemeteryScheduledProperty.belongsTo(models.ItemUsage, { foreignKey: 'propertyId', as: 'itemUsage' })
    cemeteryScheduledProperty.belongsTo(models.DisintermentInfoSection, { foreignKey: 'disintermentInfoSectionId', as: 'disintermentInfo' })
    cemeteryScheduledProperty.belongsTo(models.IntermentInformationSection, { foreignKey: 'intermentInfoSectionId', as: 'intermentInfo' })
    cemeteryScheduledProperty.addScope('propertiesScope', {
      include: [
        {
          model: models.ItemUsage,
          as: 'itemUsage',
          required: true,
          include: [
            {
              model: models.AgreementProperty.scope('propertyScope'),
              as: 'agreementProperties',
              required: true
            }
          ]
        }
      ]
    })
  };
  return cemeteryScheduledProperty;
};