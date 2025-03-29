'use strict';
module.exports = (sequelize, DataTypes) => {
  const SchedulingAttributeSubSection = sequelize.define('SchedulingAttributeSubSection', {
    schedulingAttributeSectionId: DataTypes.INTEGER,
    subSection: DataTypes.STRING,
    subSectionLabel: DataTypes.STRING
  }, {
    tableName: 'SchedulingAttributeSubSection',
    timestamps: false
  });
  SchedulingAttributeSubSection.associate = function(models) {
    // associations can be defined here
  };
  return SchedulingAttributeSubSection;
};