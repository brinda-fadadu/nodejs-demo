'use strict';
module.exports = (sequelize, DataTypes) => {
  const DisintermentInfoSection = sequelize.define('DisintermentInfoSection', {
    beginningTime: DataTypes.DATE,
    endingTime: DataTypes.DATE,
    disintermentReason: DataTypes.STRING,
    disintermentType: DataTypes.STRING,
    instruction: DataTypes.TEXT
  }, {
    tableName: 'DisintermentInfoSection',
    timestamps: false
  });
  DisintermentInfoSection.associate = function(models) {
    // associations can be defined here
    DisintermentInfoSection.hasMany(models.CemeteryScheduledProperty, { foreignKey: 'disintermentInfoSectionId', as: 'properties' })
    DisintermentInfoSection.addScope('disintermentInfoPropertiesScope', {
      include: [
        {
          model: models.CemeteryScheduledProperty.scope('propertiesScope'),
          as: 'properties'
        }
      ]
    })
  };
  return DisintermentInfoSection;
};