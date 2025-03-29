'use strict';
module.exports = (sequelize, DataTypes) => {
  const SubServiceSection = sequelize.define('SubServiceSection', {
    subServiceId: DataTypes.INTEGER,
    startTime: DataTypes.DATE,
    endTime: DataTypes.DATE,
    scheduledFuneralServiceId: DataTypes.INTEGER
  }, {
    tableName: 'SubServiceSection',
    timestamps: false
  });
  SubServiceSection.associate = function(models) {
    // associations can be defined here
    SubServiceSection.belongsTo(models.SubService, { foreignKey: 'subServiceId', as: 'subService' })
  };
  return SubServiceSection;
};