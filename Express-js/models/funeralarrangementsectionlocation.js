'use strict';
module.exports = (sequelize, DataTypes) => {
  const FuneralArrangementSectionLocation = sequelize.define('FuneralArrangementSectionLocation', {
    type: DataTypes.STRING, //type values should be: viewing, visitation1,visitation2,visitation3, reception
    location: DataTypes.STRING,
    startTime: DataTypes.DATE,
    endTime: DataTypes.DATE,
    funeralArrangementSectionId: DataTypes.INTEGER
  }, {
    tableName: 'FuneralArrangementSectionLocation',
    timestamps: false
  });
  FuneralArrangementSectionLocation.associate = function(models) {
    // associations can be defined here
  };
  return FuneralArrangementSectionLocation;
};