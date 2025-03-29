'use strict';
module.exports = (sequelize, DataTypes) => {
  const ResourceSection = sequelize.define('ResourceSection', {
    isHearseNeeded: DataTypes.BOOLEAN,
    isUtilityCarNeeded: DataTypes.BOOLEAN,
    crematoryId: DataTypes.INTEGER,
    crematoryDate: DataTypes.DATE,
    crematoryStartTime: DataTypes.DATE,
    crematoryEndTime: DataTypes.DATE
  }, {
    tableName: 'ResourceSection',
    timestamps: false
  });
  ResourceSection.associate = function(models) {
    // associations can be defined here
    ResourceSection.belongsTo(models.Chapel, {foreignKey: 'crematoryId', as: 'crematory'})
    ResourceSection.hasMany(models.ResourcePallbearer, { foreignKey: 'resourcesectionId', as: 'pallbearers' })
    ResourceSection.hasMany(models.Note, {
      as: 'resourceSectionNotes',
      foreignKey: 'resourceId'
    })
  };
  return ResourceSection;
};