'use strict';
module.exports = (sequelize, DataTypes) => {
  const IntermentInformationSection = sequelize.define('IntermentInformationSection', {
    beginningTime: DataTypes.DATE,
    endingTime: DataTypes.DATE,
    temporaryBurialLocationId: DataTypes.INTEGER,
    temporaryDisintermentLocationId: DataTypes.INTEGER,
    memorialInformation: DataTypes.STRING,
    isPreburied: DataTypes.BOOLEAN,
    cremationType: DataTypes.STRING
  }, {
    tableName: 'IntermentInformationSection',
    timestamps: false
  });
  IntermentInformationSection.associate = function(models) {
    // associations can be defined here
    IntermentInformationSection.hasMany(models.CemeteryScheduledProperty, { foreignKey: 'intermentInfoSectionId', as: 'properties' })
    IntermentInformationSection.addScope('intermentInfoPropertiesScope', {
      include: [
        {
          model: models.CemeteryScheduledProperty.scope('propertiesScope'),
          as: 'properties'
        }
      ]
    })
  };
  return IntermentInformationSection;
};