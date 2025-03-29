'use strict';
module.exports = (sequelize, DataTypes) => {
  const BodyTrackingNumberCounter = sequelize.define('BodyTrackingNumberCounter', {
    year: DataTypes.INTEGER,
    value: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    locationId: DataTypes.INTEGER
  }, {
    tableName: 'BodyTrackingNumberCounter',
    timeStamps: true
  });
  BodyTrackingNumberCounter.associate = function(models) {
    // associations can be defined here
  };
  return BodyTrackingNumberCounter;
};

